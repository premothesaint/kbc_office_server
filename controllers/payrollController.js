const supabase = require('../config/supabase');
let db = null;
try { db = require('../config/database'); } catch (e) {}

const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function sortPeriods(periods) {
  return (periods || []).slice().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const ma = MONTH_ORDER.indexOf(a.month);
    const mb = MONTH_ORDER.indexOf(b.month);
    if (ma !== mb) return ma - mb;
    return (a.start_day || 0) - (b.start_day || 0);
  });
}

class PayrollController {
  // ==================== PAYROLL PERIODS ====================

  async getPayrollPeriods(req, res) {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('payroll_periods').select('*');
        if (error) throw error;
        return res.json(sortPeriods(data));
      }
      if (!db) return res.status(503).json({ error: 'Database not configured' });
      const [periods] = await db.query(`
        SELECT * FROM payroll_periods 
        ORDER BY year DESC, 
          FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'), 
          start_day
      `);
      res.json(periods);
    } catch (error) {
      console.error('Error fetching payroll periods:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getCurrentPayrollPeriod(req, res) {
    try {
      const now = new Date();
      const year = parseInt(req.query.year || now.getFullYear(), 10);
      const month = req.query.month || now.toLocaleString('default', { month: 'long' });
      const day = parseInt(req.query.day || now.getDate(), 10);
      if (supabase) {
        const { data, error } = await supabase
          .from('payroll_periods')
          .select('*')
          .eq('year', year)
          .eq('month', month)
          .lte('start_day', day)
          .gte('end_day', day);
        if (error) throw error;
        const period = (data && data.length > 0) ? data[0] : null;
        if (!period) return res.status(404).json({ error: 'No payroll period found for current date' });
        return res.json(period);
      }
      if (!db) return res.status(503).json({ error: 'Database not configured' });
      const [periods] = await db.query(`
        SELECT * FROM payroll_periods 
        WHERE year = ? AND month = ? AND ? BETWEEN start_day AND end_day LIMIT 1
      `, [year, month, day]);
      if (periods.length === 0) {
        return res.status(404).json({ error: 'No payroll period found for current date' });
      }
      res.json(periods[0]);
    } catch (error) {
      console.error('Error fetching current payroll period:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPayrollPeriodById(req, res) {
    try {
      const periodId = req.params.periodId;
      if (supabase) {
        const { data, error } = await supabase
          .from('payroll_periods')
          .select('*')
          .eq('id', periodId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Payroll period not found' });
        return res.json(data);
      }
      if (!db) return res.status(503).json({ error: 'Database not configured' });
      const [periods] = await db.query('SELECT * FROM payroll_periods WHERE id = ?', [periodId]);
      if (periods.length === 0) {
        return res.status(404).json({ error: 'Payroll period not found' });
      }
      res.json(periods[0]);
    } catch (error) {
      console.error('Error fetching payroll period:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ==================== EMPLOYEES ====================
  
  async getEmployeesByDepartment(req, res) {
    try {
      const [employees] = await db.query(`
        SELECT 
          e.id,
          e.employee_id,
          e.name,
          e.department,
          e.position,
          e.rate_type,
          COALESCE(e.daily_rate, e.fixed_rate) as rate,
          e.is_active
        FROM employees e
        WHERE e.is_active = 1
        ORDER BY 
          FIELD(e.department, 'OFFICE', 'DRIVER', 'WAREHOUSE', 'SECURITY & CUSTODIAN', 'FARM'),
          e.name
      `);
      
      // Group by department
      const grouped = employees.reduce((acc, emp) => {
        // Format department key for frontend compatibility
        const deptKey = emp.department.toLowerCase()
          .replace(/ & /g, '_')
          .replace(/ /g, '_');
        
        // Map specific department names
        let finalKey = deptKey;
        if (deptKey.includes('security')) finalKey = 'security';
        if (deptKey.includes('warehouse')) finalKey = 'warehouse';
        if (deptKey.includes('driver')) finalKey = 'driver';
        if (deptKey.includes('office')) finalKey = 'office';
        
        if (!acc[finalKey]) acc[finalKey] = [];
        acc[finalKey].push(emp);
        return acc;
      }, {});
      
      // Ensure all expected departments exist
      const expectedDepartments = ['office', 'driver', 'warehouse', 'security'];
      expectedDepartments.forEach(dept => {
        if (!grouped[dept]) grouped[dept] = [];
      });
      
      res.json(grouped);
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ==================== ATTENDANCE ====================
  
  async getAttendanceForPeriod(req, res) {
    const { periodId } = req.params;
    
    try {
      const [attendance] = await db.query(`
        SELECT 
          ar.*,
          e.name as employee_name,
          e.department,
          COALESCE(e.daily_rate, e.fixed_rate) as rate
        FROM attendance_records ar
        JOIN employees e ON ar.employee_id = e.id
        WHERE ar.payroll_period_id = ?
        ORDER BY e.name, ar.day_index
      `, [periodId]);
      
      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async saveAttendance(req, res) {
    const { employeeId, periodId, date, dayIndex, status, amount, isWeekend } = req.body;
    const userId = req.user?.id || 1;
    const Employee = require('../models/Employee');

    try {
      let attendanceStatus = null;
      let attendanceAmount = null;

      if (amount !== null && amount !== undefined && amount !== '') {
        attendanceStatus = 'present';
        attendanceAmount = parseFloat(amount);
      } else if (status === 'A' || status === 'absent') {
        attendanceStatus = 'absent';
        attendanceAmount = 0;
      } else if (status === 'NO' || status === 'no_out') {
        attendanceStatus = 'no_out';
        attendanceAmount = 0;
      } else if (status === 'NI' || status === 'no_in') {
        attendanceStatus = 'no_in';
        attendanceAmount = 0;
      } else if (status === 'present') {
        const emp = await Employee.findById(employeeId);
        if (emp) {
          attendanceStatus = 'present';
          attendanceAmount = parseFloat(emp.daily_rate ?? emp.fixed_rate ?? 0) || 0;
        }
      }

      if (supabase) {
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('payroll_period_id', periodId)
          .eq('day_index', dayIndex)
          .maybeSingle();
        const dateVal = date && date.includes('-') ? date : null;
        const row = {
          employee_id: parseInt(employeeId, 10),
          payroll_period_id: parseInt(periodId, 10),
          date: dateVal || new Date().toISOString().split('T')[0],
          day_index: parseInt(dayIndex, 10),
          status: attendanceStatus,
          amount: attendanceAmount,
          is_weekend: !!isWeekend,
          created_by: userId,
          updated_at: new Date().toISOString()
        };
        if (existing) {
          await supabase.from('attendance_records').update(row).eq('id', existing.id);
        } else {
          await supabase.from('attendance_records').insert(row);
        }
        return res.json({ success: true, message: 'Attendance saved successfully' });
      }

      if (!db) return res.status(503).json({ error: 'Database not configured' });
      if (status === 'present' && attendanceStatus == null) {
        const [employee] = await db.query(
          'SELECT COALESCE(daily_rate, fixed_rate) as rate FROM employees WHERE id = ?',
          [employeeId]
        );
        if (employee?.length > 0) {
          attendanceStatus = 'present';
          attendanceAmount = parseFloat(employee[0].rate) || 0;
        }
      }
      const [existing] = await db.query(
        'SELECT id FROM attendance_records WHERE employee_id = ? AND payroll_period_id = ? AND day_index = ?',
        [employeeId, periodId, dayIndex]
      );
      if (existing.length > 0) {
        await db.query(
          `UPDATE attendance_records SET status = ?, amount = ?, updated_at = NOW(), created_by = ? WHERE id = ?`,
          [attendanceStatus, attendanceAmount, userId, existing[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO attendance_records (employee_id, payroll_period_id, date, day_index, status, amount, is_weekend, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [employeeId, periodId, date, dayIndex, attendanceStatus, attendanceAmount, isWeekend || 0, userId]
        );
      }
      res.json({ success: true, message: 'Attendance saved successfully' });
    } catch (error) {
      console.error('Error saving attendance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE attendance method using query parameters
  async deleteAttendance(req, res) {
    // Use query parameters for DELETE request
    const { employeeId, periodId, date, dayIndex } = req.query;
    
    try {
      console.log('Attempting to delete attendance record with query params:', {
        employeeId,
        periodId, 
        date,
        dayIndex
      });
      
      // Validate required parameters
      if (!employeeId || !periodId || !dayIndex) {
        return res.status(400).json({ 
          error: 'Missing required parameters: employeeId, periodId, and dayIndex are required' 
        });
      }
      
      // Build WHERE conditions
      const conditions = ['employee_id = ?', 'payroll_period_id = ?', 'day_index = ?'];
      const values = [employeeId, periodId, dayIndex];
      
      // Add date condition if provided
      if (date) {
        conditions.push('date = ?');
        values.push(date);
      }
      
      const whereClause = conditions.join(' AND ');
      const deleteQuery = `DELETE FROM attendance_records WHERE ${whereClause}`;
      
      console.log('Executing delete query:', deleteQuery);
      console.log('With values:', values);
      
      const [result] = await db.query(deleteQuery, values);
      
      console.log('Delete completed. Affected rows:', result.affectedRows);
      
      if (result.affectedRows > 0) {
        res.json({
          success: true,
          message: 'Attendance record successfully deleted',
          affectedRows: result.affectedRows
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'No attendance record found with the specified criteria',
          affectedRows: 0
        });
      }
      
    } catch (error) {
      console.error('Database error during delete:', error);
      res.status(500).json({ 
        error: 'Failed to delete attendance record',
        details: error.message,
        sqlMessage: error.sqlMessage
      });
    }
  }

  // ==================== PAYROLL SUMMARY ====================
  
  async getPayrollSummary(req, res) {
    const { periodId } = req.params;
    
    try {
      // Get period details
      const [period] = await db.query(
        'SELECT * FROM payroll_periods WHERE id = ?',
        [periodId]
      );
      
      if (period.length === 0) {
        return res.status(404).json({ error: 'Payroll period not found' });
      }
      
      // Get employees with their attendance
      const [employees] = await db.query(`
        SELECT 
          e.id,
          e.employee_id,
          e.name,
          e.department,
          e.position,
          e.rate_type,
          COALESCE(e.daily_rate, e.fixed_rate) as rate,
          e.is_active
        FROM employees e
        WHERE e.is_active = 1
        ORDER BY 
          FIELD(e.department, 'OFFICE', 'DRIVER', 'WAREHOUSE', 'SECURITY & CUSTODIAN', 'FARM'),
          e.name
      `);
      
      // Get attendance for each employee
      const employeesWithAttendance = await Promise.all(
        employees.map(async (emp) => {
          const [attendance] = await db.query(`
            SELECT 
              day_index,
              status,
              amount
            FROM attendance_records 
            WHERE employee_id = ? AND payroll_period_id = ?
            ORDER BY day_index
          `, [emp.id, periodId]);
          
          // Create attendance array
          const attendanceArray = Array(period[0].end_day - period[0].start_day + 1).fill(undefined);
          
          attendance.forEach(record => {
            const index = record.day_index - 1;
            if (index >= 0 && index < attendanceArray.length) {
              if (record.status === 'present') {
                const rate = parseFloat(emp.rate) || 0;
                const amount = record.amount !== null ? parseFloat(record.amount) : rate;
                attendanceArray[index] = amount;
              } else if (record.status === 'absent') {
                attendanceArray[index] = 'A';
              } else if (record.status === 'no_out') {
                attendanceArray[index] = 'NO';
              } else if (record.status === 'no_in') {
                attendanceArray[index] = 'NI';
              }
            }
          });

          
          // Calculate working days and gross salary
          const workingDays = attendance.filter(r => 
            r.status === 'present'  // ONLY count 'present' status
          ).length;
          
          const grossSalary = attendance
            .filter(r => r.status === 'present')
            .reduce((sum, r) => {
              const rate = parseFloat(emp.rate) || 0;
              const amount = r.amount !== null ? parseFloat(r.amount) : rate;
              return sum + amount;
            }, 0);
          
          return {
            ...emp,
            attendance: attendanceArray,
            workingDays,
            grossSalary
          };
        })
      );
      
      // Generate dates for the period
      const dates = [];
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthNames.findIndex(m => m === period[0].month);
      const dayNames = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
      
      for (let day = period[0].start_day; day <= period[0].end_day; day++) {
        const date = new Date(period[0].year, monthIndex, day);
        dates.push({
          date: day,
          day: dayNames[date.getDay()],
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          monthName: period[0].month.substring(0, 3),
          fullDate: date.toISOString().split('T')[0]
        });
      }
      
      // Group by department
      const grouped = employeesWithAttendance.reduce((acc, emp) => {
        const deptKey = emp.department.toLowerCase()
          .replace(/ & /g, '_')
          .replace(/ /g, '_');
        
        let finalKey = deptKey;
        if (deptKey.includes('security')) finalKey = 'security';
        if (deptKey.includes('warehouse')) finalKey = 'warehouse';
        if (deptKey.includes('driver')) finalKey = 'driver';
        if (deptKey.includes('office')) finalKey = 'office';
        
        if (!acc[finalKey]) acc[finalKey] = [];
        acc[finalKey].push({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          rate: emp.rate,
          rate_type: emp.rate_type,
          attendance: emp.attendance,
          workingDays: emp.workingDays,
          grossSalary: emp.grossSalary
        });
        return acc;
      }, { office: [], driver: [], warehouse: [], security: [] });
      
      // Calculate daily totals
      const dailyTotals = dates.map((_, dayIndex) => {
        return employeesWithAttendance.reduce((sum, emp) => {
          const value = emp.attendance[dayIndex];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      });
      
      // Calculate grand total
      const grandTotal = employeesWithAttendance.reduce((sum, emp) => sum + emp.grossSalary, 0);
      
      res.json({
        period: period[0],
        dates,
        employees: grouped,
        dailyTotals,
        grandTotal
      });
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ==================== DAILY TOTALS ====================
  
  async getDailyTotals(req, res) {
    const { periodId } = req.params;
    
    try {
      const [totals] = await db.query(`
        SELECT 
          ar.day_index,
          DATE(ar.date) as date,
          SUM(COALESCE(ar.amount, 0)) as total_amount,
          COUNT(DISTINCT ar.employee_id) as employees_count
        FROM attendance_records ar
        WHERE ar.payroll_period_id = ?
        GROUP BY ar.day_index, ar.date
        ORDER BY ar.day_index
      `, [periodId]);
      
      res.json(totals);
    } catch (error) {
      console.error('Error calculating daily totals:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ==================== EXPORT ====================
  
  async exportPayrollToCSV(req, res) {
    const { periodId } = req.params;
    
    try {
      const [data] = await db.query(`
        SELECT 
          e.employee_id,
          e.name,
          e.department,
          e.position,
          COALESCE(e.daily_rate, e.fixed_rate) as rate,
          p.period_name,
          p.year,
          p.month,
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as days_present,
          SUM(COALESCE(ar.amount, 0)) as total_earnings
        FROM employees e
        CROSS JOIN payroll_periods p
        LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.payroll_period_id = p.id
        WHERE p.id = ? AND e.is_active = 1
        GROUP BY e.id, p.id
        ORDER BY e.department, e.name
      `, [periodId]);
      
      // Convert to CSV
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-period-${periodId}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting payroll:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ==================== BASIC IMPLEMENTATIONS ====================
  
  async generatePayrollSummary(req, res) {
    const { periodId } = req.params;
    res.json({ message: 'Payroll summary generated', periodId });
  }

  async processPayroll(req, res) {
    const { periodId } = req.params;
    res.json({ message: 'Payroll processed', periodId });
  }

  async getPayrollStatus(req, res) {
    const { periodId } = req.params;
    res.json({ periodId, status: 'pending', processed: false });
  }

  // Stub methods for other endpoints
  async bulkSaveAttendance(req, res) {
    res.json({ message: 'Bulk attendance saved' });
  }

  async getTimesheets(req, res) {
    res.json({ message: 'Timesheets endpoint' });
  }

  async createTimesheet(req, res) {
    res.json({ message: 'Timesheet created' });
  }

  async approveTimesheet(req, res) {
    res.json({ message: 'Timesheet approved' });
  }

  async getAttendanceReport(req, res) {
    res.json({ message: 'Attendance report' });
  }

  async getSalaryReport(req, res) {
    res.json({ message: 'Salary report' });
  }

  async getDepartmentReport(req, res) {
    res.json({ message: 'Department report' });
  }

  async getPayrollStatistics(req, res) {
    res.json({ message: 'Payroll statistics' });
  }

  async backupPayrollData(req, res) {
    res.json({ message: 'Payroll data backed up' });
  }

  async getWorkingDays(req, res) {
    res.json({ message: 'Working days' });
  }

  async validateAttendance(req, res) {
    res.json({ message: 'Attendance validated' });
  }

  async getPayrollSettings(req, res) {
    res.json({ message: 'Payroll settings' });
  }

  async getPayrollDashboard(req, res) {
    res.json({ message: 'Payroll dashboard' });
  }
}

// Export the class instance properly
module.exports = new PayrollController();