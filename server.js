require('dotenv').config();
const app = require('./app');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Database connection and server start
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    const db = require('./config/database');
    
    // Test database connection
    const [result] = await db.query('SELECT 1');
    console.log('✅ Database connection successful');
    
    // Check if we have the required tables
    const [tables] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('users', 'employees')
    `, [process.env.DB_NAME]);
    
    if (tables[0].count < 2) {
      console.warn('⚠️  Some required tables may be missing. Run the SQL setup script.');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Docs: http://localhost:${PORT}/api`);
      console.log(`🌐 React app: http://localhost:5173`);
      
      console.log('\n👥 Demo Users (from database):');
      console.log('├─ Admin: admin / admin123');
      console.log('├─ Payroll: payroll / payroll123');
      console.log('└─ Petty Cash: pettycash / petty123');
      
      console.log('\n📈 Server Info:');
      console.log(`├─ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`├─ Node.js: ${process.version}`);
      console.log(`└─ Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Check if MySQL is running: `sudo service mysql status`');
    console.error('2. Verify database credentials in .env file');
    console.error('3. Ensure database "kbc_office" exists');
    console.error('4. Run the SQL setup script to create tables');
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app; // For testing purposes
