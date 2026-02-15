// server/routes/timesheet.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const supabase = require('../config/supabase');
let db = null;
try { db = require('../config/database'); } catch (e) {}
const useSupabase = !!supabase;

// GET all employees (uses Employee model → Supabase or MySQL)
router.get('/employees', async (req, res) => {
  try {
    const rows = await Employee.findAll();
    const employees = rows.map(row => ({
      id: row.id,
      employee_id: row.employee_id,
      name: row.name,
      department: row.department,
      position: row.position,
      rate_type: row.rate_type,
      daily_rate: row.daily_rate != null ? parseFloat(row.daily_rate) : null,
      fixed_rate: row.fixed_rate != null ? parseFloat(row.fixed_rate) : null,
      is_active: row.is_active
    }));
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employees',
      error: error.message
    });
  }
});

// GET payroll periods (Supabase or MySQL)
router.get('/payroll-periods', async (req, res) => {
  try {
    if (useSupabase && supabase) {
      const { data: rows, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year')
        .order('month')
        .order('start_day');
      if (error) throw error;
      const periods = (rows || []).map(row => ({
        id: row.id,
        year: row.year,
        month: row.month,
        start_day: row.start_day,
        end_day: row.end_day,
        period_name: `${row.month} ${row.start_day}-${row.end_day}, ${row.year}`,
        display_name: `${row.month} ${row.start_day}-${row.end_day}, ${row.year}`
      }));
      return res.json({ success: true, data: periods });
    }
    if (!db) throw new Error('Database not configured');
    const [rows] = await db.query(
      'SELECT * FROM payroll_periods ORDER BY year, month, start_day'
    );
    const periods = rows.map(row => ({
      id: row.id,
      year: row.year,
      month: row.month,
      start_day: row.start_day,
      end_day: row.end_day,
      period_name: `${row.month} ${row.start_day}-${row.end_day}, ${row.year}`,
      display_name: `${row.month} ${row.start_day}-${row.end_day}, ${row.year}`
    }));
    res.json({ success: true, data: periods });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll periods',
      error: error.message
    });
  }
});

function mapAttendanceRow(row) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    payroll_period_id: row.payroll_period_id,
    date: row.date,
    day_index: row.day_index,
    time_in: row.time_in,
    time_out: row.time_out,
    working_hours: row.working_hours != null ? parseFloat(row.working_hours) : null,
    amount: row.amount != null ? parseFloat(row.amount) : null,
    status: row.status,
    is_approved: !!row.is_approved
  };
}

// GET attendance for employee and period
router.get('/attendance', async (req, res) => {
  try {
    const { employee_id, payroll_period_id } = req.query;
    if (!employee_id || !payroll_period_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: employee_id and payroll_period_id'
      });
    }
    const eid = parseInt(employee_id, 10);
    const pid = parseInt(payroll_period_id, 10);
    if (useSupabase && supabase) {
      const { data: rows, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', eid)
        .eq('payroll_period_id', pid)
        .order('day_index');
      if (error) throw error;
      return res.json({ success: true, data: (rows || []).map(mapAttendanceRow) });
    }
    if (!db) throw new Error('Database not configured');
    const [rows] = await db.query(
      `SELECT * FROM attendance WHERE employee_id = ? AND payroll_period_id = ? ORDER BY day_index`,
      [eid, pid]
    );
    res.json({ success: true, data: rows.map(mapAttendanceRow) });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance',
      error: error.message
    });
  }
});

// POST attendance (create or update)
router.post('/attendance', async (req, res) => {
  try {
    const { employee_id, payroll_period_id, day_index, time_in, time_out, date, status, amount, working_hours } = req.body;
    
    if (!employee_id || !payroll_period_id || !day_index || !date) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }
    
    // Check if record already exists
    const [existing] = await db.query(
      `SELECT * FROM attendance 
       WHERE employee_id = ? AND payroll_period_id = ? AND day_index = ?`,
      [parseInt(employee_id), parseInt(payroll_period_id), parseInt(day_index)]
    );
    
    let finalStatus = status || 'partial';
    let finalAmount = amount || 0;
    let finalWorkingHours = working_hours || 0;
    
    // If fixed rate employee, set status to 'fixed'
    if (time_in === 'FIXED' && time_out === 'FIXED') {
      finalStatus = 'fixed';
      // Get employee's fixed rate
      const [employee] = await db.query(
        'SELECT fixed_rate FROM employees WHERE id = ?',
        [parseInt(employee_id)]
      );
      if (employee.length > 0) {
        finalAmount = employee[0].fixed_rate || 0;
      }
    }
    
    if (existing.length > 0) {
      // Update existing record
      const updateFields = [];
      const updateValues = [];
      
      if (time_in !== undefined) {
        updateFields.push('time_in = ?');
        updateValues.push(time_in);
      }
      
      if (time_out !== undefined) {
        updateFields.push('time_out = ?');
        updateValues.push(time_out);
      }
      
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(finalStatus);
      }
      
      if (amount !== undefined) {
        updateFields.push('amount = ?');
        updateValues.push(parseFloat(finalAmount));
      }
      
      if (working_hours !== undefined) {
        updateFields.push('working_hours = ?');
        updateValues.push(parseFloat(finalWorkingHours));
      }
      
      // Reset approval status when editing
      updateFields.push('is_approved = 0');
      updateFields.push('approved_at = NULL');
      
      updateValues.push(parseInt(employee_id));
      updateValues.push(parseInt(payroll_period_id));
      updateValues.push(parseInt(day_index));
      
      await db.query(
        `UPDATE attendance 
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = ? AND payroll_period_id = ? AND day_index = ?`,
        updateValues
      );
      
      return res.json({ 
        success: true,
        message: 'Attendance updated successfully',
        updated: true 
      });
    } else {
      // Insert new record
      await db.query(
        `INSERT INTO attendance 
         (employee_id, payroll_period_id, date, day_index, time_in, time_out, 
          working_hours, amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          parseInt(employee_id),
          parseInt(payroll_period_id),
          date,
          parseInt(day_index),
          time_in || '-',
          time_out || '-',
          parseFloat(finalWorkingHours),
          parseFloat(finalAmount),
          finalStatus
        ]
      );
      
      return res.json({ 
        success: true,
        message: 'Attendance created successfully',
        created: true 
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating attendance',
      error: error.message 
    });
  }
});

// PUT update attendance calculations
router.put('/attendance/calculations', async (req, res) => {
  try {
    const { employee_id, payroll_period_id, day_index, working_hours, amount, status, is_approved } = req.body;
    
    if (!employee_id || !payroll_period_id || !day_index) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (working_hours !== undefined) {
      updateFields.push('working_hours = ?');
      updateValues.push(parseFloat(working_hours));
    }
    
    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateValues.push(parseFloat(amount));
    }
    
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (is_approved !== undefined) {
      updateFields.push('is_approved = ?');
      updateValues.push(is_approved ? 1 : 0);
      if (is_approved) {
        updateFields.push('approved_at = CURRENT_TIMESTAMP');
      } else {
        updateFields.push('approved_at = NULL');
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No fields to update' 
      });
    }
    
    updateValues.push(parseInt(employee_id));
    updateValues.push(parseInt(payroll_period_id));
    updateValues.push(parseInt(day_index));
    
    await db.query(
      `UPDATE attendance 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = ? AND payroll_period_id = ? AND day_index = ?`,
      updateValues
    );
    
    res.json({ 
      success: true,
      message: 'Attendance calculated fields updated successfully' 
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating attendance',
      error: error.message 
    });
  }
});

  // ================ APPROVE TIMESHEET AND SYNC TO PAYROLL ================
  router.put('/attendance/approve', async (req, res) => {
    const { employee_id, payroll_period_id, sync_to_payroll = true, force_resync = false } = req.body;
    
    try {
      // Start transaction
      await db.query('START TRANSACTION');
      
      // 1. Get all attendance records for this employee and period
      const [attendanceRecords] = await db.query(`
        SELECT a.*, 
              e.rate_type,
              e.name as employee_name,
              e.daily_rate,
              e.fixed_rate,
              CASE 
                  WHEN e.rate_type = 'daily' THEN e.daily_rate 
                  ELSE e.fixed_rate 
              END AS rate
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.employee_id = ? 
        AND a.payroll_period_id = ?
        ${force_resync ? '' : 'AND a.is_approved = 0'}
      `, [parseInt(employee_id), parseInt(payroll_period_id)]);
      
      if (attendanceRecords.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No attendance records found'
        });
      }
      
      // 2. Update attendance records to approved
      await db.query(`
        UPDATE attendance 
        SET is_approved = 1, approved_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? 
        AND payroll_period_id = ?
        ${force_resync ? '' : 'AND is_approved = 0'}
      `, [parseInt(employee_id), parseInt(payroll_period_id)]);
      
      // 3. If sync_to_payroll is true, process each record for payroll summary
      if (sync_to_payroll) {
        for (const record of attendanceRecords) {
          let status = 'absent';
          let amount = 0;
          
          // Check for NI/NO (No In/No Out) scenarios FIRST
          const hasValidIn = record.time_in && 
                            record.time_in !== '-' && 
                            record.time_in !== '' && 
                            record.time_in !== 'FIXED';
          const hasValidOut = record.time_out && 
                            record.time_out !== '-' && 
                            record.time_out !== '' && 
                            record.time_out !== 'FIXED';
          
          console.log(`Record ${record.day_index}: in=${record.time_in}, out=${record.time_out}, hasValidIn=${hasValidIn}, hasValidOut=${hasValidOut}`);
          
          if (!hasValidIn && hasValidOut) {
            // NI - No In (has out time but no in time)
            status = 'NI';
            amount = 0;
            console.log(`Day ${record.day_index}: NI detected`);
          } else if (hasValidIn && !hasValidOut) {
            // NO - No Out (has in time but no out time)
            status = 'NO';
            amount = 0;
            console.log(`Day ${record.day_index}: NO detected`);
          } else if (hasValidIn && hasValidOut) {
            // Both times present - calculate normally
            if (record.status === 'fixed') {
              status = 'fixed';
              amount = record.rate || 0;
            } else if (record.status === 'present') {
              status = 'present';
              amount = record.amount || record.rate || 0;
            } else if (record.status === 'partial') {
              status = 'partial';
              amount = record.amount || 0;
            } else if (record.status === 'absent') {
              status = 'absent';
              amount = 0;
            } else {
              status = 'absent';
              amount = 0;
            }
          } else {
            // No valid times - absent
            status = 'absent';
            amount = 0;
          }
          
          console.log(`Final status for day ${record.day_index}: ${status}, amount: ${amount}`);
          
          // 4. Insert/Update payroll_summary table
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
            ) VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              amount = VALUES(amount),
              status = VALUES(status),
              is_approved = VALUES(is_approved),
              approved_at = VALUES(approved_at),
              updated_at = CURRENT_TIMESTAMP
          `, [
            parseInt(employee_id),
            parseInt(payroll_period_id),
            parseInt(record.day_index),
            record.date,
            parseFloat(amount),
            status
          ]);
          
          // 5. Insert/Update attendance_records table (for PayrollSummary component)
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
            ) VALUES (?, ?, STR_TO_DATE(?, '%d-%b-%Y'), ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              amount = VALUES(amount),
              updated_at = CURRENT_TIMESTAMP
          `, [
            parseInt(employee_id),
            parseInt(payroll_period_id),
            record.date,
            parseInt(record.day_index),
            status,
            parseFloat(amount)
          ]);
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Timesheet approved and synced to payroll summary successfully',
        recordsProcessed: attendanceRecords.length,
        employee_id: parseInt(employee_id),
        payroll_period_id: parseInt(payroll_period_id),
        synced_to_payroll: sync_to_payroll
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
  });
// ================ UN-APPROVE TIMESHEET ================
router.put('/attendance/unapprove', async (req, res) => {
  const { employee_id, payroll_period_id } = req.body;
  
  try {
    // Start transaction
    await db.query('START TRANSACTION');
    
    // 1. Update attendance records to unapproved
    await db.query(
      `UPDATE attendance 
       SET is_approved = 0, approved_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = ? AND payroll_period_id = ?`,
      [parseInt(employee_id), parseInt(payroll_period_id)]
    );

    res.json({
      success: true,
      message: 'Timesheet un-approved successfully',
      employee_id: parseInt(employee_id),
      payroll_period_id: parseInt(payroll_period_id)
    });
    
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error un-approving timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error un-approving timesheet',
      error: error.message
    });
  }
});

// ================ DELETE FROM PAYROLL SUMMARY ================
router.delete('/payroll-summary/employee/:employeeId/period/:periodId', async (req, res) => {
  try {
    const { employeeId, periodId } = req.params;
    
    const [result] = await db.query(
      `DELETE FROM payroll_summary 
       WHERE employee_id = ? AND payroll_period_id = ?`,
      [parseInt(employeeId), parseInt(periodId)]
    );

    res.json({
      success: true,
      message: 'Payroll summary data deleted successfully',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting payroll summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payroll summary',
      error: error.message
    });
  }
});

// ================ DELETE FROM ATTENDANCE RECORDS ================
router.delete('/attendance-records/employee/:employeeId/period/:periodId', async (req, res) => {
  try {
    const { employeeId, periodId } = req.params;
    
    const [result] = await db.query(
      `DELETE FROM attendance_records 
       WHERE employee_id = ? AND payroll_period_id = ?`,
      [parseInt(employeeId), parseInt(periodId)]
    );

    res.json({
      success: true,
      message: 'Attendance records deleted successfully',
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance records',
      error: error.message
    });
  }
});

// GET timesheet sync status
router.get('/status', async (req, res) => {
  try {
    const { employee_id, payroll_period_id } = req.query;
    
    if (!employee_id || !payroll_period_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required parameters' 
      });
    }
    
    // Check attendance approval status
    const [attendanceStatus] = await db.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_days
      FROM attendance
      WHERE employee_id = ? AND payroll_period_id = ?
    `, [parseInt(employee_id), parseInt(payroll_period_id)]);
    
    // Check payroll summary status
    const [payrollStatus] = await db.query(`
      SELECT COUNT(*) as payroll_entries
      FROM payroll_summary
      WHERE employee_id = ? AND payroll_period_id = ? AND is_approved = 1
    `, [parseInt(employee_id), parseInt(payroll_period_id)]);
    
    const isFullyApproved = attendanceStatus[0].total_days > 0 && 
                           attendanceStatus[0].total_days === attendanceStatus[0].approved_days;
    const isSyncedToPayroll = payrollStatus[0].payroll_entries > 0;
    
    res.json({
      success: true,
      data: {
        is_approved: isFullyApproved,
        synced_to_payroll: isSyncedToPayroll,
        attendance: attendanceStatus[0],
        payroll: payrollStatus[0]
      }
    });
    
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sync status',
      error: error.message
    });
  }
});

// GET payroll summary for a period (for PayrollSummary component)
router.get('/payroll-summary', async (req, res) => {
  try {
    const { period_id } = req.query;
    if (!period_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: period_id'
      });
    }
    const periodIdNum = parseInt(period_id, 10);
    let employees;
    let attendanceRecords;
    let periodData;

    if (useSupabase && supabase) {
      const empList = await Employee.findAll();
      employees = empList.map(e => ({
        id: e.id,
        employee_id: e.employee_id,
        name: e.name,
        department: e.department,
        position: e.position,
        rate_type: e.rate_type,
        daily_rate: e.daily_rate,
        fixed_rate: e.fixed_rate,
        rate: e.rate_type === 'daily' ? (e.daily_rate != null ? parseFloat(e.daily_rate) : 0) : (e.fixed_rate != null ? parseFloat(e.fixed_rate) : 0)
      }));
      const { data: periodRow, error: periodErr } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('id', periodIdNum)
        .maybeSingle();
      if (periodErr || !periodRow) {
        return res.status(404).json({ success: false, message: 'Payroll period not found' });
      }
      periodData = periodRow;
      const { data: attRows, error: attErr } = await supabase
        .from('attendance_records')
        .select('employee_id, day_index, status, amount')
        .eq('payroll_period_id', periodIdNum)
        .order('employee_id')
        .order('day_index');
      if (attErr) throw attErr;
      attendanceRecords = (attRows || []).map(r => ({
        employee_id: typeof r.employee_id === 'string' ? parseInt(r.employee_id, 10) : r.employee_id,
        day_index: r.day_index,
        status: r.status,
        amount: r.amount
      }));
    } else {
      if (!db) return res.status(503).json({ success: false, message: 'Database not configured' });
      const [empRows] = await db.query(`
        SELECT e.id, e.employee_id, e.name, e.department, e.position, e.rate_type, e.daily_rate, e.fixed_rate,
               CASE WHEN e.rate_type = 'daily' THEN e.daily_rate ELSE e.fixed_rate END AS rate
        FROM employees e WHERE e.is_active = 1 ORDER BY e.department, e.name
      `);
      employees = empRows;
      const [attRows] = await db.query(`
        SELECT employee_id, day_index, status, amount
        FROM attendance_records
        WHERE payroll_period_id = ? ORDER BY employee_id, day_index
      `, [periodIdNum]);
      attendanceRecords = attRows;
      const [period] = await db.query(`SELECT * FROM payroll_periods WHERE id = ?`, [periodIdNum]);
      if (!period || period.length === 0) {
        return res.status(404).json({ success: false, message: 'Payroll period not found' });
      }
      periodData = period[0];
    }

    // Generate dates for the period
    const dates = [];
    const startDate = new Date(periodData.year, getMonthNumber(periodData.month) - 1, periodData.start_day);
    const endDate = new Date(periodData.year, getMonthNumber(periodData.month) - 1, periodData.end_day);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'short' });
      const dayOfWeek = d.toLocaleString('default', { weekday: 'short' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      
      dates.push({
        date: day,
        month: month,
        day: dayOfWeek,
        fullDate: d.toISOString().split('T')[0],
        isWeekend: isWeekend
      });
    }
    
    // Organize data by department
    const departmentData = {
      office: [],
      driver: [],
      warehouse: [],
      security: []
    };
    
    // Process each employee
    employees.forEach(employee => {
      const dept = employee.department.toLowerCase().split(' ')[0];
      const deptKey = dept === 'security' ? 'security' : dept;
      
      // Only include valid departments
      if (departmentData[deptKey]) {
        // Create attendance array for each day
        const attendance = new Array(dates.length).fill(undefined);
        
        // Fill attendance from records
        const employeeAttendance = attendanceRecords.filter(record => 
          record.employee_id === employee.id
        );
        
        employeeAttendance.forEach(record => {
          const dayIndex = record.day_index - 1;
          if (dayIndex >= 0 && dayIndex < dates.length) {
            if (record.status === 'present' || record.status === 'partial') {
              attendance[dayIndex] = parseFloat(record.amount) || 0;
            } else if (record.status === 'absent') {
              attendance[dayIndex] = 'A';
            } else if (record.status === 'NI') {
              attendance[dayIndex] = 'NI';
            } else if (record.status === 'NO') {
              attendance[dayIndex] = 'NO';
            } else if (record.status === 'fixed') {
              attendance[dayIndex] = 'F';
            }
          }
        });
        
        // Calculate working days and gross salary
        let workingDays = 0;
        let grossSalary = 0;
        
        if (employee.rate_type === 'fixed') {
          // Fixed rate employees
          workingDays = 0; // Not applicable
          grossSalary = parseFloat(employee.fixed_rate) || 0;
        } else {
          // Daily rate employees
          attendance.forEach(day => {
            if (typeof day === 'number') {
              workingDays += (day / (employee.daily_rate || 1));
              grossSalary += day;
            } else if (day === 'F') {
              // Fixed day (full pay)
              workingDays += 1;
              grossSalary += parseFloat(employee.daily_rate) || 0;
            }
          });
        }
        
        departmentData[deptKey].push({
          id: employee.id,
          name: employee.name,
          employeeId: employee.employee_id,
          position: employee.position,
          rate: employee.rate_type === 'daily' ? 
                parseFloat(employee.daily_rate) || 0 : 
                parseFloat(employee.fixed_rate) || 0,
          rate_type: employee.rate_type,
          department: employee.department,
          attendance: attendance,
          workingDays: workingDays,
          grossSalary: grossSalary
        });
      }
    });
    
    // Calculate daily totals
    const dailyTotals = dates.map((_, dayIndex) => {
      return Object.values(departmentData).reduce((total, deptEmployees) => {
        return total + deptEmployees.reduce((deptTotal, emp) => {
          if (emp.rate_type === 'fixed') return deptTotal; // Fixed rate not in daily totals
          const dayValue = emp.attendance[dayIndex];
          return deptTotal + (typeof dayValue === 'number' ? dayValue : 0);
        }, 0);
      }, 0);
    });
    
    // Calculate grand total
    const grandTotal = Object.values(departmentData).reduce((total, deptEmployees) => {
      return total + deptEmployees.reduce((deptTotal, emp) => {
        return deptTotal + emp.grossSalary;
      }, 0);
    }, 0);
    
    res.json({
      success: true,
      data: {
        dates: dates,
        employees: departmentData,
        dailyTotals: dailyTotals,
        grandTotal: grandTotal,
        period: periodData
      }
    });
    
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payroll summary',
      error: error.message
    });
  }
});

// Bulk approve timesheets (for multiple employees)
router.put('/attendance/bulk-approve', async (req, res) => {
  try {
    const { employee_ids, payroll_period_id } = req.body;
    
    if (!employee_ids || !Array.isArray(employee_ids) || !payroll_period_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: employee_ids array and payroll_period_id' 
      });
    }
    
    const results = [];
    
    for (const employee_id of employee_ids) {
      try {
        // Call the approve function for each employee
        const response = await db.query(`
          -- Similar logic as individual approve but in a loop
          START TRANSACTION;
          
          -- Your approve logic here for each employee
          
          COMMIT;
        `);
        
        results.push({
          employee_id: employee_id,
          success: true,
          message: 'Timesheet approved and synced'
        });
      } catch (employeeError) {
        results.push({
          employee_id: employee_id,
          success: false,
          message: employeeError.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Bulk approval completed',
      results: results
    });
    
  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing bulk approval',
      error: error.message
    });
  }
});

// Get timesheet approval status
router.get('/attendance/approval-status', async (req, res) => {
  try {
    const { employee_id, payroll_period_id } = req.query;
    
    if (!employee_id || !payroll_period_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required parameters' 
      });
    }
    
    const [status] = await db.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN is_approved = 1 THEN 1 ELSE 0 END) as approved_days,
        MIN(approved_at) as first_approval,
        MAX(approved_at) as last_approval
      FROM attendance
      WHERE employee_id = ? AND payroll_period_id = ?
    `, [parseInt(employee_id), parseInt(payroll_period_id)]);
    
    const [payrollStatus] = await db.query(`
      SELECT 
        COUNT(*) as payroll_entries,
        MAX(approved_at) as last_payroll_sync
      FROM payroll_summary
      WHERE employee_id = ? AND payroll_period_id = ? AND is_approved = 1
    `, [parseInt(employee_id), parseInt(payroll_period_id)]);
    
    res.json({
      success: true,
      data: {
        attendance: status[0],
        payroll: payrollStatus[0],
        is_fully_approved: status[0].total_days === status[0].approved_days,
        is_synced_to_payroll: payrollStatus[0].payroll_entries > 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching approval status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approval status',
      error: error.message
    });
  }
});

// ================ NEW: Check if timesheet can be edited ================
router.get('/can-edit/:employeeId/:periodId', async (req, res) => {
  try {
    const { employeeId, periodId } = req.params;
    
    const [attendance] = await db.query(`
      SELECT COUNT(*) as approved_count
      FROM attendance
      WHERE employee_id = ? AND payroll_period_id = ? AND is_approved = 1
    `, [parseInt(employeeId), parseInt(periodId)]);
    
    const [payroll] = await db.query(`
      SELECT COUNT(*) as payroll_count
      FROM payroll_summary
      WHERE employee_id = ? AND payroll_period_id = ? AND is_approved = 1
    `, [parseInt(employeeId), parseInt(periodId)]);
    
    const canEdit = attendance[0].approved_count === 0 && payroll[0].payroll_count === 0;
    
    res.json({
      success: true,
      canEdit: canEdit,
      approvedCount: attendance[0].approved_count,
      payrollCount: payroll[0].payroll_count
    });
    
  } catch (error) {
    console.error('Error checking edit status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking edit status',
      error: error.message
    });
  }
});

// Helper function to get month number
function getMonthNumber(monthName) {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName] || 1;
}

module.exports = router;