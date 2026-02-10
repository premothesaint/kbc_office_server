const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development');
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

const payrollMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'payroll') {
    return res.status(403).json({ error: 'Access denied. Payroll or Admin only.' });
  }
  next();
};

const pettyCashMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pettycash') {
    return res.status(403).json({ error: 'Access denied. Petty Cash or Admin only.' });
  }
  next();
};

module.exports = { 
  authMiddleware, 
  adminMiddleware,
  payrollMiddleware,
  pettyCashMiddleware 
};