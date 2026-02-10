const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Apply authentication middleware if you have it
// const authMiddleware = require('../middleware/auth');
// router.use(authMiddleware);

// ==================== BASIC PAYROLL ROUTES ====================
router.get('/periods', payrollController.getPayrollPeriods);
router.get('/periods/current', payrollController.getCurrentPayrollPeriod);
router.get('/periods/:periodId', payrollController.getPayrollPeriodById);

// ==================== EMPLOYEES ====================
router.get('/employees/department', payrollController.getEmployeesByDepartment);

// ==================== ATTENDANCE ====================
router.get('/periods/:periodId/attendance', payrollController.getAttendanceForPeriod);
router.post('/attendance', payrollController.saveAttendance);
// ADD THIS DELETE ROUTE
router.delete('/attendance', payrollController.deleteAttendance);

// ==================== PAYROLL SUMMARY ====================
router.get('/periods/:periodId/summary', payrollController.getPayrollSummary);
router.post('/periods/:periodId/generate-summary', payrollController.generatePayrollSummary);

// ==================== DAILY TOTALS ====================
router.get('/periods/:periodId/daily-totals', payrollController.getDailyTotals);

// ==================== EXPORT ====================
router.get('/periods/:periodId/export/csv', payrollController.exportPayrollToCSV);

// ==================== BASIC ROUTES ====================
router.post('/periods/:periodId/process', payrollController.processPayroll);
router.get('/periods/:periodId/status', payrollController.getPayrollStatus);

module.exports = router;