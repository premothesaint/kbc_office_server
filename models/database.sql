-- Create database
CREATE DATABASE IF NOT EXISTS kbc_office;
USE kbc_office;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'payroll', 'pettycash') DEFAULT 'payroll',
  full_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default admin user (password: admin123)
-- You need to generate bcrypt hash for this password
-- Use: const bcrypt = require('bcryptjs'); const hash = bcrypt.hashSync('admin123', 10);
INSERT INTO users (username, email, password, role, full_name, department, is_active) 
VALUES (
  'admin',
  'admin@kbc-office.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'admin',
  'Administrator',
  'Management',
  TRUE
);

-- Insert sample payroll user
INSERT INTO users (username, email, password, role, full_name, department, is_active) 
VALUES (
  'payroll',
  'payroll@kbc-office.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'payroll',
  'Payroll Manager',
  'Finance',
  TRUE
);

-- Insert sample petty cash user
INSERT INTO users (username, email, password, role, full_name, department, is_active) 
VALUES (
  'pettycash',
  'pettycash@kbc-office.com',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  'pettycash',
  'Petty Cash Handler',
  'Finance',
  TRUE
);

-- Petty Cash transactions table
CREATE TABLE IF NOT EXISTS petty_cash (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  date DATE NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Payroll records table
CREATE TABLE IF NOT EXISTS payroll (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT,
  employee_name VARCHAR(100) NOT NULL,
  basic_salary DECIMAL(10,2) NOT NULL,
  allowances DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) NOT NULL,
  month_year DATE NOT NULL, -- First day of the month, e.g., '2024-01-01'
  status ENUM('pending', 'processed', 'paid') DEFAULT 'pending',
  processed_by INT,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_month_year (month_year)
);

-- Time sheets table
CREATE TABLE IF NOT EXISTS timesheets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT,
  employee_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_date (date),
  INDEX idx_employee_date (employee_id, date)
);

-- Password reset tokens (optional for future feature)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activity logs (optional for future feature)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);