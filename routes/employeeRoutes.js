const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authMiddleware, payrollMiddleware } = require('../middleware/auth');

// Employee login route (public)
router.post('/login', employeeController.employeeLogin); // Make sure this function exists

// All other employee routes require payroll or admin access
router.use(authMiddleware);
router.use(payrollMiddleware);

// Employee CRUD routes
router.post('/', employeeController.createEmployee);
router.get('/', employeeController.getAllEmployees);
router.get('/stats', employeeController.getEmployeeStats);
router.get('/:id', employeeController.getEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

// Password management routes
router.post('/reset-password', employeeController.resetEmployeePassword);
router.get('/:id/check-password', employeeController.checkEmployeePassword);

// Employee self-service password update (requires employee auth)
router.post('/update-password', employeeController.updateEmployeePassword);

module.exports = router;