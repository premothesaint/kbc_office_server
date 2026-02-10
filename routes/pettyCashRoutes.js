const express = require('express');
const router = express.Router();
const { authMiddleware, pettyCashMiddleware } = require('../middleware/auth');

// All petty cash routes require petty cash or admin access
router.use(authMiddleware);
router.use(pettyCashMiddleware);

// Petty cash routes
router.get('/', (req, res) => {
  res.json({ message: 'Petty cash data' });
});

router.post('/transactions', (req, res) => {
  res.json({ message: 'Petty cash transaction created' });
});

module.exports = router;