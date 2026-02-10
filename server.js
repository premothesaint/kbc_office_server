const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const pettyCashRoutes = require('./routes/pettyCashRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const timesheetRoutes = require('./routes/timesheet');

const app = express();

// CORS configuration - allow both ports for flexibility
const allowedOrigins = [
  'http://localhost:5173',  // React dev server (Vite default)
  'http://localhost:3000',  // React dev server (Create React App default)
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      console.warn(`CORS blocked: ${origin}`);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timesheet', timesheetRoutes);


// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'KBC Office Management System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      users: {
        list: 'GET /api/users',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        deactivate: 'PATCH /api/users/:id/deactivate'
      },
      employees: {
        list: 'GET /api/employees',
        create: 'POST /api/employees',
        update: 'PUT /api/employees/:id'
      },
      payroll: {
        periods: 'GET /api/payroll/periods',
        summary: 'GET /api/payroll/summary/:periodId',
        attendance: 'POST /api/payroll/attendance',
        export: 'GET /api/payroll/export/:periodId'
      },
      pettyCash: {
        list: 'GET /api/petty-cash',
        create: 'POST /api/petty-cash',
        approve: 'PATCH /api/petty-cash/:id/approve'
      }
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.query('SELECT 1');
    
    // Check if essential tables exist
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.tables 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('users', 'employees', 'payroll_periods')
    `, [process.env.DB_NAME]);
    
    res.json({ 
      status: 'OK', 
      message: 'KBC Office Server is running',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        essentialTables: tables.length
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Pre-flight requests
app.options('*', cors());

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method 
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id || 'Unauthenticated'
  });
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Please log in again' 
    });
  }
  
  // Handle token expiration
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      error: 'Token expired',
      message: 'Please log in again' 
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error',
      details: err.message 
    });
  }
  
  // Handle database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ 
      error: 'Duplicate entry',
      message: 'A record with this information already exists' 
    });
  }
  
  // Default error
  const statusCode = err.status || 500;
  const response = {
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});

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

// Start the server
startServer();

module.exports = app; // For testing purposes