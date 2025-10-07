const express = require('express');
const { query } = require('express-validator');
const Store = require('../models/Store');
const Rating = require('../models/Rating');
const User = require('../models/User');
const { protect, isStoreOwner } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get store owner dashboard
// @route   GET /api/store-owner/dashboard
// @access  Private (Store owners only)
router.get('/dashboard', async (req, res) => {
  try {
    // Get store owned by the current user
    const store = await Store.findOne({ 
      owner: req.user.id, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this user'
      });
    }

    // Get rating statistics for the store
    const ratingStats = await Rating.aggregate([
      { $match: { store: store._id } },
      {
        $group: {
          _id: '$store',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratings: {
            $push: {
              rating: '$rating',
              review: '$review',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt'
            }
          }
        }
      }
    ]);

    const stats = ratingStats.length > 0 ? ratingStats[0] : {
      averageRating: 0,
      totalRatings: 0,
      ratings: []
    };

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalRatings: stats.totalRatings,
        recentRatings: stats.ratings.slice(-5).reverse() // Last 5 ratings
      }
    });
  } catch (error) {
    console.error('Store owner dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get all ratings for store owner's store
// @route   GET /api/store-owner/ratings
// @access  Private (Store owners only)
router.get('/ratings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['rating', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get store owned by the current user
    const store = await Store.findOne({ 
      owner: req.user.id, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this user'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get ratings for the store with pagination and sorting
    const ratings = await Rating.find({ store: store._id })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    // Get total count
    const total = await Rating.countDocuments({ store: store._id });

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRatings: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get store ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get users who rated the store
// @route   GET /api/store-owner/users
// @access  Private (Store owners only)
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'email', 'rating', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get store owned by the current user
    const store = await Store.findOne({ 
      owner: req.user.id, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this user'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users who rated the store with their ratings
    const ratings = await Rating.find({ store: store._id })
      .populate('user', 'name email address')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Rating.countDocuments({ store: store._id });

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        users: ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get store users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get detailed rating statistics for store owner's store
// @route   GET /api/store-owner/statistics
// @access  Private (Store owners only)
router.get('/statistics', async (req, res) => {
  try {
    // Get store owned by the current user
    const store = await Store.findOne({ 
      owner: req.user.id, 
      isActive: true 
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this user'
      });
    }

    // Get detailed rating statistics
    const ratingStats = await Rating.aggregate([
      { $match: { store: store._id } },
      {
        $group: {
          _id: '$store',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          },
          ratings: {
            $push: {
              rating: '$rating',
              review: '$review',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt'
            }
          }
        }
      }
    ]);

    if (ratingStats.length === 0) {
      return res.json({
        success: true,
        data: {
          store: {
            id: store._id,
            name: store.name,
            email: store.email,
            address: store.address
          },
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0
          },
          recentRatings: []
        }
      });
    }

    const stats = ratingStats[0];
    
    // Calculate rating distribution
    const ratingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    
    stats.ratingDistribution.forEach(rating => {
      ratingDistribution[rating]++;
    });

    // Get recent ratings (last 10)
    const recentRatings = await Rating.find({ store: store._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalRatings: stats.totalRatings,
        ratingDistribution,
        recentRatings
      }
    });
  } catch (error) {
    console.error('Get store statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get store owner's store information
// @route   GET /api/store-owner/store
// @access  Private (Store owners only)
router.get('/store', async (req, res) => {
  try {
    const store = await Store.findOne({ 
      owner: req.user.id, 
      isActive: true 
    }).populate('owner', 'name email');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'No store found for this user'
      });
    }

    // Get average rating
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

    const averageRating = ratingStats.length > 0 ? 
      Math.round(ratingStats[0].averageRating * 10) / 10 : 0;
    const totalRatings = ratingStats.length > 0 ? ratingStats[0].totalRatings : 0;

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address,
          owner: store.owner,
          averageRating,
          totalRatings,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get store info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

