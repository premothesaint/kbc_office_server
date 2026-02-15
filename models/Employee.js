const bcrypt = require('bcrypt');

const supabase = require('../config/supabase');
let db = null;
if (!process.env.SUPABASE_URL) {
  try {
    db = require('../config/database');
  } catch (e) {
    // database.js may throw if MySQL not configured
  }
}

const useSupabase = !!supabase;

function rowToEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    employee_id: row.employee_id,
    name: row.name,
    department: row.department,
    position: row.position,
    rate_type: row.rate_type,
    daily_rate: row.daily_rate != null ? parseFloat(row.daily_rate) : null,
    fixed_rate: row.fixed_rate != null ? parseFloat(row.fixed_rate) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_active: row.is_active,
    password: row.password
  };
}

class Employee {
  static async getNextEmployeeId() {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id')
        .like('employee_id', 'EMP-%')
        .order('employee_id', { ascending: false })
        .limit(1);
      if (error) throw error;
      let maxId = 0;
      if (data && data.length > 0) {
        const match = (data[0].employee_id || '').match(/^EMP-(\d+)$/);
        if (match) maxId = parseInt(match[1], 10);
      }
      return `EMP-${String(maxId + 1).padStart(3, '0')}`;
    }
    const [rows] = await db.query(
      `SELECT MAX(CAST(SUBSTRING(employee_id, 5) AS UNSIGNED)) as max_id 
       FROM employees WHERE employee_id LIKE 'EMP-%'`
    );
    const nextId = (rows[0]?.max_id || 0) + 1;
    return `EMP-${String(nextId).padStart(3, '0')}`;
  }

  static async create(employeeData) {
    let hashedPassword = null;
    if (employeeData.password) {
      hashedPassword = await bcrypt.hash(employeeData.password, 10);
    }
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          employee_id: employeeData.employee_id,
          name: employeeData.name,
          department: employeeData.department,
          position: employeeData.position,
          password: hashedPassword,
          rate_type: employeeData.rate_type,
          daily_rate: employeeData.daily_rate,
          fixed_rate: employeeData.fixed_rate
        })
        .select('id')
        .single();
      if (error) throw error;
      return data?.id;
    }
    const [result] = await db.query(
      `INSERT INTO employees 
       (employee_id, name, department, position, password, rate_type, daily_rate, fixed_rate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeData.employee_id,
        employeeData.name,
        employeeData.department,
        employeeData.position,
        hashedPassword,
        employeeData.rate_type,
        employeeData.daily_rate,
        employeeData.fixed_rate
      ]
    );
    return result.insertId;
  }

  static async findAll() {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_id, name, department, position, rate_type, daily_rate, fixed_rate, created_at, updated_at, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []).map(rowToEmployee);
    }
    const [rows] = await db.query(
      `SELECT id, employee_id, name, department, position, 
              rate_type, daily_rate, fixed_rate, 
              created_at, updated_at, is_active 
       FROM employees WHERE is_active = TRUE ORDER BY name ASC`
    );
    return rows;
  }

  static async findById(id) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return rowToEmployee(data);
    }
    const [rows] = await db.query(
      `SELECT id, employee_id, name, department, position, 
              rate_type, daily_rate, fixed_rate, 
              created_at, updated_at, is_active 
       FROM employees WHERE id = ? AND is_active = TRUE`,
      [id]
    );
    return rows[0];
  }

  static async findByEmployeeId(employeeId) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return rowToEmployee(data);
    }
    const [rows] = await db.query(
      `SELECT * FROM employees WHERE employee_id = ? AND is_active = TRUE`,
      [employeeId]
    );
    return rows[0];
  }

  static async update(id, employeeData) {
    const payload = {
      name: employeeData.name,
      department: employeeData.department,
      position: employeeData.position,
      rate_type: employeeData.rate_type,
      daily_rate: employeeData.daily_rate,
      fixed_rate: employeeData.fixed_rate,
      updated_at: new Date().toISOString()
    };
    if (employeeData.password) {
      payload.password = await bcrypt.hash(employeeData.password, 10);
    }
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      return data?.length ?? 0;
    }
    let updateQuery, queryParams;
    if (employeeData.password) {
      const hashedPassword = await bcrypt.hash(employeeData.password, 10);
      updateQuery = `UPDATE employees SET name = ?, department = ?, position = ?, password = ?, rate_type = ?, daily_rate = ?, fixed_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      queryParams = [employeeData.name, employeeData.department, employeeData.position, hashedPassword, employeeData.rate_type, employeeData.daily_rate, employeeData.fixed_rate, id];
    } else {
      updateQuery = `UPDATE employees SET name = ?, department = ?, position = ?, rate_type = ?, daily_rate = ?, fixed_rate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      queryParams = [employeeData.name, employeeData.department, employeeData.position, employeeData.rate_type, employeeData.daily_rate, employeeData.fixed_rate, id];
    }
    const [result] = await db.query(updateQuery, queryParams);
    return result.affectedRows;
  }

  static async delete(id) {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      return data?.length ?? 0;
    }
    const [result] = await db.query(
      `UPDATE employees SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
    return result.affectedRows;
  }

  static async getStats() {
    if (useSupabase && supabase) {
      const { data: list, error } = await supabase
        .from('employees')
        .select('id, department, password')
        .eq('is_active', true);
      if (error) throw error;
      const total_employees = (list || []).length;
      const departments = new Set((list || []).map((r) => r.department).filter(Boolean));
      const employees_with_password = (list || []).filter((r) => r.password != null && r.password !== '').length;
      return {
        total_employees,
        total_departments: departments.size,
        employees_with_password
      };
    }
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(DISTINCT department) as total_departments,
        SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END) as employees_with_password
      FROM employees WHERE is_active = TRUE
    `);
    return stats[0];
  }

  static async verifyPassword(employeeId, password) {
    const employee = await this.findByEmployeeId(employeeId);
    if (!employee || !employee.password) return false;
    return bcrypt.compare(password, employee.password);
  }
}

module.exports = Employee;
