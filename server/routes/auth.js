const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { register, login, getCurrentUser, updatePassword, logout } = require('../controllers/authController');

// ...existing code...
const router = express.Router();

// Function to generate JWT token
// const generateToken = (id) => {
//   let expiresIn = process.env.JWT_EXPIRE;
//   if (!expiresIn) {
//     expiresIn = '7d';
//   }
  
//   const token = jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: expiresIn,
//   });
  
//   return token;
// };

// Register new user
router.post('/register', [
  body('name')
    .isLength({ min: 3, max: 60 }) 
    .withMessage('Name must be between 3 and 60 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8, max: 16 })
    .withMessage('Password must be between 8 and 16 characters')
    .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)
    .withMessage('Password must contain at least one uppercase letter and one special character'),
  body('address')
    .isLength({ max: 400 })
    .withMessage('Address cannot exceed 400 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'store_owner'])
    .withMessage('Role must be admin, user, or store_owner')
], register
);

// Login user
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], login
    
);

// Get current user info
router.get('/me', protect, getCurrentUser);

// Update password
router.put('/update-password', [
  protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8, max: 16 })
    .withMessage('New password must be between 8 and 16 characters')
    .matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)
    .withMessage('New password must contain at least one uppercase letter and one special character')
], updatePassword);

// Logout user
router.post('/logout', protect,logout);

module.exports = router;