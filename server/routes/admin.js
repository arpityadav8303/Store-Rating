const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Store = require('../models/Store');
const Rating = require('../models/Rating');
const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes need authentication and admin access
router.use(protect);
router.use(isAdmin);

// Get admin dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    // Count active users
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Count active stores
    const totalStores = await Store.countDocuments({ isActive: true });
    
    // Count all ratings
    const totalRatings = await Rating.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers,
        totalStores: totalStores,
        totalRatings: totalRatings
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all users with filtering and sorting
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'email', 'address', 'role', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('role').optional().isIn(['admin', 'user', 'store_owner']).withMessage('Invalid role filter')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get query parameters
    let page = req.query.page;
    if (!page) {
      page = 1;
    }
    page = parseInt(page);

    let limit = req.query.limit;
    if (!limit) {
      limit = 10;
    }
    limit = parseInt(limit);

    let sortBy = req.query.sortBy;
    if (!sortBy) {
      sortBy = 'createdAt';
    }

    let sortOrder = req.query.sortOrder;
    if (sortOrder === 'asc') {
      sortOrder = 1;
    } else {
      sortOrder = -1;
    }

    let search = req.query.search;
    let role = req.query.role;

    // Build filter
    let filter = {};

    if (role) {
      filter.role = role;
    } else {
      filter.isActive = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    let skip = (page - 1) * limit;

    // Create sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Get users
    const users = await User.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-password');

    // Add stores for store owners
    let usersWithStores = [];
    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      let userObj = user.toObject();
      
      if (user.role === 'store_owner') {
        const stores = await Store.find({ owner: user._id, isActive: true })
          .select('name email address')
          .lean();
        
        // Get rating for each store
        for (let j = 0; j < stores.length; j++) {
          let store = stores[j];
          
          const ratingStats = await Rating.aggregate([
            { $match: { store: store._id } },
            {
              $group: {
                _id: '$store',
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 }
              }
            }
          ]);
          
          if (ratingStats.length > 0) {
            let avgRating = ratingStats[0].averageRating;
            avgRating = avgRating * 10;
            avgRating = Math.round(avgRating);
            avgRating = avgRating / 10;
            store.averageRating = avgRating;
            store.totalRatings = ratingStats[0].totalRatings;
          } else {
            store.averageRating = 0;
            store.totalRatings = 0;
          }
        }
        
        userObj.stores = stores;
      }
      
      usersWithStores.push(userObj);
    }

    // Count total users
    const total = await User.countDocuments(filter);

    // Calculate pagination
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        users: usersWithStores,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalUsers: total,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all stores with filtering and sorting
router.get('/stores', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'email', 'address', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('search').optional().isString().withMessage('Search must be a string')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get query parameters
    let page = req.query.page;
    if (!page) {
      page = 1;
    }
    page = parseInt(page);

    let limit = req.query.limit;
    if (!limit) {
      limit = 10;
    }
    limit = parseInt(limit);

    let sortBy = req.query.sortBy;
    if (!sortBy) {
      sortBy = 'createdAt';
    }

    let sortOrder = req.query.sortOrder;
    if (sortOrder === 'asc') {
      sortOrder = 1;
    } else {
      sortOrder = -1;
    }

    let search = req.query.search;

    // Build filter
    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    let skip = (page - 1) * limit;

    // Create sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Get stores
    const stores = await Store.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean();

    // Add ratings to each store
    let storesWithRatings = [];
    for (let i = 0; i < stores.length; i++) {
      let store = stores[i];
      
      const ratingStats = await Rating.aggregate([
        { $match: { store: store._id } },
        {
          $group: {
            _id: '$store',
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);

      let storeWithRating = { ...store };
      
      if (ratingStats.length > 0) {
        let avgRating = ratingStats[0].averageRating;
        avgRating = avgRating * 10;
        avgRating = Math.round(avgRating);
        avgRating = avgRating / 10;
        storeWithRating.averageRating = avgRating;
        storeWithRating.totalRatings = ratingStats[0].totalRatings;
      } else {
        storeWithRating.averageRating = 0;
        storeWithRating.totalRatings = 0;
      }
      
      storesWithRatings.push(storeWithRating);
    }

    // Count total stores
    const total = await Store.countDocuments(filter);

    // Calculate pagination
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        stores: storesWithRatings,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalStores: total,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      }
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create new user
router.post('/users', [
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
    .isIn(['admin', 'user', 'store_owner'])
    .withMessage('Role must be admin, user, or store_owner')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get data from request
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const address = req.body.address;
    const role = req.body.role;

    // Check if user exists
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name: name,
      email: email,
      password: password,
      address: address,
      role: role,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Create new store
router.post('/stores', [
  body('name')
    .notEmpty()
    .withMessage('Store name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Store name must be between 3 and 100 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('address')
    .isLength({ max: 400 })
    .withMessage('Address cannot exceed 400 characters'),
  body('ownerName')
    .notEmpty()
    .withMessage('Store owner name is required')
    .isLength({ min: 3 })
    .withMessage('Owner name must be at least 3 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get data from request
    const name = req.body.name;
    const email = req.body.email;
    const address = req.body.address;
    const ownerName = req.body.ownerName;

    // Check if store exists
    const existingStore = await Store.findOne({ email: email });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'Store already exists with this email'
      });
    }

    // Find owner by name
    const owner = await User.findOne({ 
        name: { $regex: ownerName, $options: 'i' }, 
        role: 'store_owner' 
    });
    
    if (!owner) {
        console.error('Store owner lookup failed for name: ' + ownerName + '. No matching user found with role store_owner.');
        
        return res.status(404).json({
            success: false,
            message: 'Store owner "' + ownerName + '" not found. Please ensure the full name is correct and the user exists with the store_owner role.'
        });
    }

    // Get owner ID
    const ownerId = owner._id;

    // Create store
    const store = await Store.create({
      name: name,
      email: email,
      address: address,
      owner: ownerId
    });

    // Add owner info to response
    await store.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store: store
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update store
router.put('/stores/:id', [ 
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
              success: false, 
              message: 'Validation errors', 
              errors: errors.array() 
            });
        }

        // Find store
        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).json({ 
              success: false, 
              message: 'Store not found' 
            });
        }

        // Update allowed fields
        const allowedUpdates = ['name', 'email', 'address', 'isActive'];
        let keys = Object.keys(req.body);
        
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          let isAllowed = false;
          
          for (let j = 0; j < allowedUpdates.length; j++) {
            if (allowedUpdates[j] === key) {
              isAllowed = true;
              break;
            }
          }
          
          if (isAllowed && req.body[key] !== undefined) {
            store[key] = req.body[key];
          }
        }

        // Update owner if provided
        if (req.body.ownerId) {
            store.owner = req.body.ownerId;
        }

        // Save store
        await store.save();

        res.json({
            success: true,
            message: 'Store updated successfully',
            store: store.toObject()
        });
    } catch (error) {
        console.error('Update store error:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Server error', 
          error: error.message 
        });
    }
});

// Get user details by ID
router.get('/users/:id', async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let userObj = user.toObject();

    // Add stores if user is store owner
    if (user.role === 'store_owner') {
      const stores = await Store.find({ owner: user._id, isActive: true })
        .select('name email address')
        .lean();
      
      // Get rating for each store
      for (let i = 0; i < stores.length; i++) {
        let store = stores[i];
        
        const ratingStats = await Rating.aggregate([
          { $match: { store: store._id } },
          {
            $group: {
              _id: '$store',
              averageRating: { $avg: '$rating' },
              totalRatings: { $sum: 1 }
            }
          }
        ]);
        
        if (ratingStats.length > 0) {
          let avgRating = ratingStats[0].averageRating;
          avgRating = avgRating * 10;
          avgRating = Math.round(avgRating);
          avgRating = avgRating / 10;
          store.averageRating = avgRating;
          store.totalRatings = ratingStats[0].totalRatings;
        } else {
          store.averageRating = 0;
          store.totalRatings = 0;
        }
      }
      
      userObj.stores = stores;
    }

    res.json({
      success: true,
      data: userObj
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update user
router.put('/users/:id', [
  body('name')
    .optional()
    .isLength({ min: 3, max: 60 }) 
    .withMessage('Name must be between 3 and 60 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('address')
    .optional()
    .isLength({ max: 400 })
    .withMessage('Address cannot exceed 400 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'user', 'store_owner'])
    .withMessage('Role must be admin, user, or store_owner'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    const allowedUpdates = ['name', 'email', 'address', 'role', 'isActive'];
    let keys = Object.keys(req.body);
    
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let isAllowed = false;
      
      for (let j = 0; j < allowedUpdates.length; j++) {
        if (allowedUpdates[j] === key) {
          isAllowed = true;
          break;
        }
      }
      
      if (isAllowed && req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    }

    // Save user
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Set user as inactive
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete store (soft delete)
router.delete('/stores/:id', async (req, res) => {
  try {
    // Find store
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Set store as inactive
    store.isActive = false;
    await store.save();

    res.json({
      success: true,
      message: 'Store deleted successfully'
    });
  } catch (error) {
    console.error('Delete store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;