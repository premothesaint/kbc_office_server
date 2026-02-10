const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  // Database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Setting up KBC Office database...\n');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.execute(`USE ${process.env.DB_NAME}`);

    // Create users table
    await connection.execute(`
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
      )
    `);

    // Check if users already exist
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
    
    if (existingUsers[0].count === 0) {
      console.log('Inserting demo users...');
      
      // Insert demo users with plain text passwords (for development only)
      const users = [
        ['admin', 'admin@kbc-office.com', 'admin123', 'admin', 'Administrator', 'Management'],
        ['payroll', 'payroll@kbc-office.com', 'payroll123', 'payroll', 'Payroll Manager', 'Finance'],
        ['pettycash', 'pettycash@kbc-office.com', 'petty123', 'pettycash', 'Petty Cash Handler', 'Finance']
      ];

      for (const user of users) {
        await connection.execute(
          'INSERT INTO users (username, email, password, role, full_name, department, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
          user
        );
        console.log(`✓ Created user: ${user[0]}`);
      }

      console.log('\n✅ Database setup completed successfully!');
      console.log('\n📋 Demo credentials:');
      console.log('┌─────────────────────────────────┐');
      console.log('│ Admin:    admin / admin123      │');
      console.log('│ Payroll:  payroll / payroll123  │');
      console.log('│ Petty:    pettycash / petty123  │');
      console.log('└─────────────────────────────────┘');
      console.log('\n⚠️  WARNING: Using plain text passwords for development only!');
      console.log('   For production, install bcryptjs and hash passwords.');
    } else {
      console.log('✅ Database already contains users.');
      console.log('ℹ️  To reset database, run: DROP DATABASE kbc_office;');
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

// Check if .env file exists
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.error('❌ .env file not found!');
  console.log('Please create a .env file with:');
  console.log('DB_HOST=localhost');
  console.log('DB_USER=root');
  console.log('DB_PASSWORD=your_mysql_password');
  console.log('DB_NAME=kbc_office');
  console.log('DB_PORT=3306');
  console.log('JWT_SECRET=your-secret-key-change-this-in-production');
  process.exit(1);
}

setupDatabase();