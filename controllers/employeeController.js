const Employee = require('../models/Employee');
const bcrypt = require('bcrypt');

const employeeController = {
  // Create new employee
  createEmployee: async (req, res) => {
    try {
      const { name, department, position, rate_type, daily_rate, fixed_rate, password } = req.body;

      // Validate required fields
      if (!name || !department || !position || !rate_type) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      // Validate rate based on rate type
      if (rate_type === 'daily' && !daily_rate) {
        return res.status(400).json({ error: 'Daily rate is required for daily rate type' });
      }
      
      if (rate_type === 'fixed' && !fixed_rate) {
        return res.status(400).json({ error: 'Fixed rate is required for fixed rate type' });
      }

      // Get next employee ID
      const employee_id = await Employee.getNextEmployeeId();

      // Prepare employee data
      const employeeData = {
        employee_id,
        name,
        department,
        position,
        rate_type,
        daily_rate: rate_type === 'daily' ? parseFloat(daily_rate) : null,
        fixed_rate: rate_type === 'fixed' ? parseFloat(fixed_rate) : null,
        password: password || null
      };

      const employeeId = await Employee.create(employeeData);
      
      res.status(201).json({
        message: 'Employee created successfully',
        employee_id,
        id: employeeId
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Get all employees
  getAllEmployees: async (req, res) => {
    try {
      const employees = await Employee.findAll();
      res.json(employees);
    } catch (error) {
      console.error('Get employees error:', error);
      const message = error.message || 'Database error';
      res.status(500).json({
        error: 'Server error',
        message: process.env.NODE_ENV === 'production' ? 'Could not load employees. Check server database config.' : message
      });
    }
  },

  // Get single employee
  getEmployee: async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      res.json(employee);
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Update employee
  updateEmployee: async (req, res) => {
    try {
      const { 
        name, 
        department, 
        position, 
        rate_type, 
        daily_rate, 
        fixed_rate, 
        password, 
        change_password 
      } = req.body;

      // Validate required fields
      if (!name || !department || !position || !rate_type) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      // Validate rate based on rate type
      if (rate_type === 'daily' && !daily_rate) {
        return res.status(400).json({ error: 'Daily rate is required for daily rate type' });
      }
      
      if (rate_type === 'fixed' && !fixed_rate) {
        return res.status(400).json({ error: 'Fixed rate is required for fixed rate type' });
      }

      // Prepare employee data
      const employeeData = {
        name,
        department,
        position,
        rate_type,
        daily_rate: rate_type === 'daily' ? parseFloat(daily_rate) : null,
        fixed_rate: rate_type === 'fixed' ? parseFloat(fixed_rate) : null
      };

      // Only update password if change_password is true and password is provided
      if (change_password === 'true' || change_password === true) {
        if (!password) {
          return res.status(400).json({ error: 'Password is required when changing password' });
        }
        employeeData.password = password;
      }

      const affectedRows = await Employee.update(req.params.id, employeeData);
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee updated successfully' });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({ error: 'Server error', details: error.message });
    }
  },

  // Delete employee (soft delete)
  deleteEmployee: async (req, res) => {
    try {
      const affectedRows = await Employee.delete(req.params.id);
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Get employee stats
  getEmployeeStats: async (req, res) => {
    try {
      const stats = await Employee.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Get employee stats error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Employee login
  employeeLogin: async (req, res) => {
    try {
      const { employee_id, password } = req.body;

      if (!employee_id || !password) {
        return res.status(400).json({ error: 'Employee ID and password are required' });
      }

      // Find employee by employee_id
      const employee = await Employee.findByEmployeeId(employee_id);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Check if employee has a password set
      if (!employee.password) {
        return res.status(401).json({ error: 'No password set for this employee' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, employee.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Generate JWT token for employee
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          id: employee.id,
          employee_id: employee.employee_id,
          name: employee.name,
          department: employee.department,
          role: 'employee' // Different role for employees
        },
        process.env.JWT_SECRET || 'your-secret-key-for-development',
        { expiresIn: '8h' }
      );

      // Return employee info without password
      const { password: _, ...employeeInfo } = employee;

      res.json({
        message: 'Login successful',
        token,
        employee: employeeInfo
      });
    } catch (error) {
      console.error('Employee login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Reset employee password (admin only)
  resetEmployeePassword: async (req, res) => {
    try {
      const { employee_id, new_password } = req.body;

      if (!employee_id || !new_password) {
        return res.status(400).json({ error: 'Employee ID and new password are required' });
      }

      // Find employee by employee_id
      const employee = await Employee.findByEmployeeId(employee_id);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Update password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.query(
        `UPDATE employees SET password = ? WHERE employee_id = ?`,
        [hashedPassword, employee_id]
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Check if employee has password
  checkEmployeePassword: async (req, res) => {
    try {
      const employee = await Employee.findById(req.params.id);
      
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      res.json({ 
        has_password: !!employee.password,
        employee_id: employee.employee_id
      });
    } catch (error) {
      console.error('Check password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Update only password for employee (self-service)
  updateEmployeePassword: async (req, res) => {
    try {
      const { current_password, new_password } = req.body;
      const employeeId = req.user.id; // From auth middleware

      if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // Get employee with password
      const [employeeRows] = await db.query(
        `SELECT * FROM employees WHERE id = ?`,
        [employeeId]
      );

      if (employeeRows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const employee = employeeRows[0];

      // Verify current password
      if (!employee.password) {
        return res.status(400).json({ error: 'No password set for this employee' });
      }

      const isValidPassword = await bcrypt.compare(current_password, employee.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.query(
        `UPDATE employees SET password = ? WHERE id = ?`,
        [hashedPassword, employeeId]
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = employeeController;