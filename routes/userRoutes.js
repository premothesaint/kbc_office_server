const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// All user routes require authentication
router.use(authMiddleware);

// Only admin can create users
router.post('/', adminMiddleware, userController.createUser);
router.get('/', adminMiddleware, userController.getAllUsers);
router.get('/:id', (req, res, next) => {
  // Users can view their own profile, admin can view any
  if (req.user.role === 'admin' || req.user.id.toString() === req.params.id) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
}, userController.getUser);

// Only admin can update users
router.put('/:id', adminMiddleware, userController.updateUser);
router.patch('/:id/deactivate', adminMiddleware, userController.deactivateUser);
router.patch('/:id/activate', adminMiddleware, userController.activateUser);

module.exports = router;