const jwt = require('jsonwebtoken');
const User = require('../models/User');


const protect = async (req, res, next) => {
  try {
    let token;

   
    if (req.headers.authorization) {
      let authHeader = req.headers.authorization;
      
      
      if (authHeader.startsWith('Bearer')) {
        
        let parts = authHeader.split(' ');
        token = parts[1];
      }
    }

    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    
    let userId = decoded.id;
    
    
    const user = await User.findById(userId).select('-password');
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Add user to request
    req.user = user;
    
    // Continue to next middleware
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Check error type
    let errorName = error.name;
    
    if (errorName === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (errorName === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

// Grant access to specific roles
const authorize = function() {
  // Get all roles passed as arguments
  let roles = [];
  for (let i = 0; i < arguments.length; i++) {
    roles.push(arguments[i]);
  }
  
  // Return middleware function
  return function(req, res, next) {
    // Get user role
    let userRole = req.user.role;
    
    // Check if user role is in allowed roles
    let isAuthorized = false;
    for (let i = 0; i < roles.length; i++) {
      if (roles[i] === userRole) {
        isAuthorized = true;
        break;
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'User role ' + userRole + ' is not authorized to access this route'
      });
    }
    
    // Continue to next middleware
    next();
  };
};

// Check if user is admin
const isAdmin = authorize('admin');

// Check if user is store owner
const isStoreOwner = authorize('store_owner');

// Check if user is normal user
const isUser = authorize('user');

module.exports = {
  protect: protect,
  authorize: authorize,
  isAdmin: isAdmin,
  isStoreOwner: isStoreOwner,
  isUser: isUser
};

