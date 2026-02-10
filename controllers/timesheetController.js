// controllers/timesheetController.js
const db = require('../config/database');

// Approve timesheet and sync to payroll summary
exports.approveTimesheet = async (req, res) => {
    const { employee_id, payroll_period_id } = req.body;
    
    try {
        // Start transaction
        await db.query('START TRANSACTION');
        
        // 1. Get all attendance records for this employee and period
        const [attendanceRecords] = await db.query(`
            SELECT a.*, 
                   e.rate_type,
                   CASE 
                       WHEN e.rate_type = 'daily' THEN e.daily_rate 
                       ELSE e.fixed_rate 
                   END AS rate
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.employee_id = ? 
            AND a.payroll_period_id = ?
            AND a.is_approved = 0
        `, [employee_id, payroll_period_id]);
        
        if (attendanceRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No pending attendance records found'
            });
        }
        
        // 2. Update attendance records to approved
        await db.query(`
            UPDATE attendance 
            SET is_approved = 1, approved_at = NOW()
            WHERE employee_id = ? 
            AND payroll_period_id = ?
            AND is_approved = 0
        `, [employee_id, payroll_period_id]);
        
        // 3. Process each record for payroll summary
        for (const record of attendanceRecords) {
            let status = 'ABSENT';
            let amount = 0;
            
            // Determine status based on attendance
            if (record.status === 'fixed') {
                status = 'FIXED';
                amount = record.rate;
            } else if (record.status === 'present') {
                status = 'PRESENT';
                amount = record.rate;
            } else if (record.status === 'partial') {
                status = 'PARTIAL';
                amount = record.amount || 0;
            } else if (record.status === 'absent') {
                status = 'ABSENT';
                amount = 0;
            } else {
                // Check for NI/NO
                if ((!record.time_in || record.time_in === '-') && 
                    (record.time_out && record.time_out !== '-')) {
                    status = 'NI'; // No In
                } else if ((!record.time_out || record.time_out === '-') && 
                          (record.time_in && record.time_in !== '-')) {
                    status = 'NO'; // No Out
                }
            }
            
            // 4. Insert/Update payroll_summary
            await db.query(`
                INSERT INTO payroll_summary (
                    employee_id,
                    payroll_period_id,
                    day_index,
                    date,
                    amount,
                    status,
                    is_approved,
                    approved_at,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    amount = VALUES(amount),
                    status = VALUES(status),
                    is_approved = VALUES(is_approved),
                    approved_at = VALUES(approved_at),
                    updated_at = NOW()
            `, [
                employee_id,
                payroll_period_id,
                record.day_index,
                record.date,
                amount,
                status
            ]);
            
            // 5. Insert/Update attendance_records
            await db.query(`
                INSERT INTO attendance_records (
                    employee_id,
                    payroll_period_id,
                    date,
                    day_index,
                    status,
                    amount,
                    is_weekend,
                    created_at,
                    updated_at
                ) VALUES (?, ?, STR_TO_DATE(?, '%d-%b-%Y'), ?, ?, ?, 0, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    amount = VALUES(amount),
                    updated_at = NOW()
            `, [
                employee_id,
                payroll_period_id,
                record.date,
                record.day_index,
                status,
                amount
            ]);
        }
        
        // Commit transaction
        await db.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Timesheet approved and synced to payroll summary',
            recordsProcessed: attendanceRecords.length
        });
        
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error approving timesheet:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving timesheet',
            error: error.message
        });
    }
};

// Get payroll summary data
exports.getPayrollSummary = async (req, res) => {
    const { period_id } = req.query;
    
    try {
        // Get payroll summary for the period
        const [summary] = await db.query(`
            SELECT 
                ps.*,
                e.name,
                e.employee_id as emp_code,
                e.department,
                e.position,
                e.rate_type,
                e.daily_rate,
                e.fixed_rate,
                CASE 
                    WHEN e.rate_type = 'daily' THEN e.daily_rate 
                    ELSE e.fixed_rate 
                END AS rate
            FROM payroll_summary ps
            JOIN employees e ON ps.employee_id = e.id
            WHERE ps.payroll_period_id = ?
            ORDER BY e.department, e.name
        `, [period_id]);
        
        // Get period details
        const [period] = await db.query(`
            SELECT * FROM payroll_periods WHERE id = ?
        `, [period_id]);
        
        // Organize by department
        const organizedData = {
            office: [],
            driver: [],
            warehouse: [],
            security: []
        };
        
        // Process data for PayrollSummary component
        summary.forEach(record => {
            const dept = record.department.toLowerCase().split(' ')[0];
            const deptKey = dept === 'security' ? 'security' : dept;
            
            if (organizedData[deptKey]) {
                organizedData[deptKey].push({
                    id: record.employee_id,
                    name: record.name,
                    employeeId: record.emp_code,
                    position: record.position,
                    rate: record.rate,
                    rate_type: record.rate_type,
                    department: record.department,
                    attendance: [], // Will be populated below
                    workingDays: 0,
                    grossSalary: 0
                });
            }
        });
        
        res.json({
            success: true,
            data: organizedData,
            period: period[0],
            totalRecords: summary.length
        });
        
    } catch (error) {
        console.error('Error fetching payroll summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payroll summary',
            error: error.message
        });
    }
}; 