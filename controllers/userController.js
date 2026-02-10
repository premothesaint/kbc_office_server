const User = require('../models/User');

const userController = {
  // Create new user (Admin only)
  createUser: async (req, res) => {
    try {
      const { username, email, password, role, full_name, department } = req.body;

      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if email already exists
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // For now, store password as plain text (TEMPORARY - for development only)
      // In production, you MUST hash the password with bcrypt
      const userId = await User.create({
        username,
        email,
        password, // WARNING: Storing plain text password - FIX THIS IN PRODUCTION
        role,
        full_name,
        department
      });

      res.status(201).json({
        message: 'User created successfully',
        userId
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Get all users (Admin only)
  getAllUsers: async (req, res) => {
    try {
      const users = await User.findAll();
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Get single user
  getUser: async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Update user (Admin only)
  updateUser: async (req, res) => {
    try {
      const { full_name, department, role } = req.body;
      
      const affectedRows = await User.update(req.params.id, {
        full_name,
        department,
        role
      });

      if (affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Deactivate user (Admin only)
  deactivateUser: async (req, res) => {
    try {
      const affectedRows = await User.deactivate(req.params.id);
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  },

  // Activate user (Admin only)
  activateUser: async (req, res) => {
    try {
      const affectedRows = await User.activate(req.params.id);
      
      if (affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User activated successfully' });
    } catch (error) {
      console.error('Activate user error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
};

module.exports = userController;