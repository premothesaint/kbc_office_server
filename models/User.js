const db = require('../config/database');

class User {
  static async create(userData) {
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role, full_name, department) VALUES (?, ?, ?, ?, ?, ?)',
      [userData.username, userData.email, userData.password, userData.role, userData.full_name, userData.department]
    );
    return result.insertId;
  }

  static async findByUsername(username) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT id, username, email, role, full_name, department, created_at, is_active FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.query(
      'SELECT id, username, email, role, full_name, department, created_at, is_active FROM users WHERE is_active = TRUE ORDER BY created_at DESC'
    );
    return rows;
  }

  static async update(id, userData) {
    const [result] = await db.query(
      'UPDATE users SET full_name = ?, department = ?, role = ? WHERE id = ?',
      [userData.full_name, userData.department, userData.role, id]
    );
    return result.affectedRows;
  }

  static async deactivate(id) {
    const [result] = await db.query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  static async activate(id) {
    const [result] = await db.query(
      'UPDATE users SET is_active = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = User;