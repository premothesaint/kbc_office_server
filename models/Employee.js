const db = require('../config/database');
const bcrypt = require('bcrypt');

class Employee {
  // Get the next employee ID
  static async getNextEmployeeId() {
    try {
      const [rows] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(employee_id, 5) AS UNSIGNED)) as max_id 
         FROM employees WHERE employee_id LIKE 'EMP-%'`
      );
      const nextId = (rows[0]?.max_id || 0) + 1;
      return `EMP-${String(nextId).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error getting next employee ID:', error);
      throw error;
    }
  }

  // Create a new employee
  static async create(employeeData) {
    try {
      let hashedPassword = null;
      if (employeeData.password) {
        hashedPassword = await bcrypt.hash(employeeData.password, 10);
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
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  // Get all employees
  static async findAll() {
    try {
      const [rows] = await db.query(
        `SELECT id, employee_id, name, department, position, 
                rate_type, daily_rate, fixed_rate, 
                created_at, updated_at, is_active 
         FROM employees WHERE is_active = TRUE ORDER BY name ASC`
      );
      return rows;
    } catch (error) {
      console.error('Error finding all employees:', error);
      throw error;
    }
  }

  // Find employee by ID
  static async findById(id) {
    try {
      const [rows] = await db.query(
        `SELECT id, employee_id, name, department, position, 
                rate_type, daily_rate, fixed_rate, 
                created_at, updated_at, is_active 
         FROM employees WHERE id = ? AND is_active = TRUE`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding employee by ID:', error);
      throw error;
    }
  }

  // Find employee by employee ID
  static async findByEmployeeId(employeeId) {
    try {
      const [rows] = await db.query(
        `SELECT * FROM employees WHERE employee_id = ? AND is_active = TRUE`,
        [employeeId]
      );
      return rows[0];
    } catch (error) {
      console.error('Error finding employee by employee ID:', error);
      throw error;
    }
  }

  // Update employee
  static async update(id, employeeData) {
    try {
      let updateQuery = '';
      let queryParams = [];
      
      if (employeeData.password) {
        const hashedPassword = await bcrypt.hash(employeeData.password, 10);
        updateQuery = `UPDATE employees SET 
          name = ?, department = ?, position = ?, 
          password = ?, rate_type = ?, daily_rate = ?, fixed_rate = ?, 
          updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`;
        queryParams = [
          employeeData.name,
          employeeData.department,
          employeeData.position,
          hashedPassword,
          employeeData.rate_type,
          employeeData.daily_rate,
          employeeData.fixed_rate,
          id
        ];
      } else {
        updateQuery = `UPDATE employees SET 
          name = ?, department = ?, position = ?, 
          rate_type = ?, daily_rate = ?, fixed_rate = ?, 
          updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?`;
        queryParams = [
          employeeData.name,
          employeeData.department,
          employeeData.position,
          employeeData.rate_type,
          employeeData.daily_rate,
          employeeData.fixed_rate,
          id
        ];
      }

      const [result] = await db.query(updateQuery, queryParams);
      return result.affectedRows;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee (soft delete)
  static async delete(id) {
    try {
      const [result] = await db.query(
        `UPDATE employees SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Get employee statistics
  static async getStats() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_employees,
          COUNT(DISTINCT department) as total_departments,
          SUM(CASE WHEN password IS NOT NULL THEN 1 ELSE 0 END) as employees_with_password
        FROM employees 
        WHERE is_active = TRUE
      `);
      return stats[0];
    } catch (error) {
      console.error('Error getting employee stats:', error);
      throw error;
    }
  }

  // Verify password
  static async verifyPassword(employeeId, password) {
    try {
      const employee = await this.findByEmployeeId(employeeId);
      if (!employee || !employee.password) {
        return false;
      }
      return await bcrypt.compare(password, employee.password);
    } catch (error) {
      console.error('Error verifying password:', error);
      throw error;
    }
  }
}

module.exports = Employee;