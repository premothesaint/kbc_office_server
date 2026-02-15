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
    if (process.env.SUPABASE_URL) {
      console.log('🔌 Starting server with Supabase configured; skipping MySQL checks');
    } else {
      const db = require('./config/database');
      const [result] = await db.query('SELECT 1');
      console.log('✅ MySQL connection successful');
      const [tables] = await db.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME IN ('users', 'employees')
      `, [process.env.DB_NAME]);
      if (tables[0].count < 2) {
        console.warn('⚠️  Some required tables may be missing. Run the SQL setup script.');
      }
    }
 
    const tryListen = (port) => {
      const server = app.listen(port, () => {
        console.log(`\n🚀 Server running on port ${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`📚 API Docs: http://localhost:${port}/api`);
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
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} in use, retrying on port ${port + 1}...`);
          tryListen(port + 1);
        } else {
          throw err;
        }
      });
    };
    tryListen(PORT);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.warn('Starting server without DB connectivity; API endpoints that require DB may fail.');
    const tryListen = (port) => {
      const server = app.listen(port, () => {
        console.log(`\n🚀 Server running on port ${port} (DB not connected)`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`📚 API Docs: http://localhost:${port}/api`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} in use, retrying on port ${port + 1}...`);
          tryListen(port + 1);
        } else {
          throw err;
        }
      });
    };
    tryListen(PORT);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app; // For testing purposes
