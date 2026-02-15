const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const pettyCashRoutes = require('./routes/pettyCashRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const timesheetRoutes = require('./routes/timesheet');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isLocalAllowed = allowedOrigins.indexOf(origin) !== -1;
    const isVercelDomain = typeof origin === 'string' && origin.includes('vercel.app');
    const isEnvAllowed = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL;
    if (isLocalAllowed || isVercelDomain || isEnvAllowed) {
      return callback(null, true);
    }
    const msg = 'The CORS policy for this site does not allow access from the specified origin.';
    console.warn(`CORS blocked: ${origin}`);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timesheet', timesheetRoutes);

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

app.get('/health', async (req, res) => {
  try {
    const db = require('./config/database');
    await db.query('SELECT 1');
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

app.options('*', cors());

app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id || 'Unauthenticated'
  });
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please log in again'
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'Please log in again'
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.message
    });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }
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

module.exports = app;
