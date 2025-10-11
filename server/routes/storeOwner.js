const express = require('express');
const { query, validationResult } = require('express-validator');
const Store = require('../models/Store');
const Rating = require('../models/Rating');
const User = require('../models/User');
const { protect, isStoreOwner } = require('../middleware/auth');

const router = express.Router();

// All routes need authentication
router.use(protect);

// Helper function to find store by owner
const findStoreByOwner = async (userId, res) => {
    const store = await Store.findOne({ 
      owner: userId, 
      isActive: true 
    });

    if (!store) {
      res.status(403).json({
        success: false,
        message: 'Access denied: No active store found for this user.'
      });
      return null;
    }
    return store;
};

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    // Find store for this owner
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) {
      return;
    }

    // Get rating statistics
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

    let stats;
    if (ratingStats.length > 0) {
      stats = ratingStats[0];
    } else {
      stats = {
        averageRating: 0,
        totalRatings: 0,
        ratings: []
      };
    }
    
    // Sort ratings by date to get recent ones
    let allRatings = stats.ratings;
    allRatings.sort(function(a, b) {
      let dateA = a.createdAt.getTime();
      let dateB = b.createdAt.getTime();
      return dateB - dateA;
    });
    
    // Get only first 5 ratings
    let recentRatings = [];
    for (let i = 0; i < 5 && i < allRatings.length; i++) {
      recentRatings.push(allRatings[i]);
    }

    // Calculate average rating rounded
    let averageRating = stats.averageRating * 10;
    averageRating = Math.round(averageRating);
    averageRating = averageRating / 10;

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        averageRating: averageRating,
        totalRatings: stats.totalRatings,
        recentRatings: recentRatings
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

// Get all ratings for store
router.get('/ratings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['rating', 'createdAt', 'updatedAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) {
      return;
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

    // Calculate skip
    let skip = (page - 1) * limit;

    // Create sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Get ratings
    const ratings = await Rating.find({ store: store._id })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    // Count total ratings
    const total = await Rating.countDocuments({ store: store._id });

    // Calculate pagination info
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        ratings: ratings,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalRatings: total,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
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

// Get users who rated the store
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'email', 'rating', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
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
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) {
      return;
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

    // Calculate skip
    let skip = (page - 1) * limit;

    // Build sort field for aggregation
    let sortField = 'lastRating.' + sortBy;
    let sortObject = {};
    sortObject[sortField] = sortOrder;

    // Get unique users who rated the store
    const uniqueUserRatings = await Rating.aggregate([
        { $match: { store: store._id } },
        { 
            $group: { 
                _id: '$user', 
                lastRating: { $last: '$$ROOT' },
                ratingCount: { $sum: 1 } 
            } 
        },
        { $sort: sortObject },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        { 
            $project: {
                _id: 0, 
                name: '$user.name', 
                email: '$user.email', 
                address: '$user.address',
                userId: '$_id',
                lastRating: '$lastRating.rating',
                lastReview: '$lastRating.review',
                ratingCount: 1 
            } 
        }
    ]);

    // Count total unique users
    const totalResult = await Rating.aggregate([
        { $match: { store: store._id } },
        { $group: { _id: '$user' } },
        { $count: 'total' }
    ]);
    
    let total = 0;
    if (totalResult.length > 0) {
      total = totalResult[0].total;
    }

    // Calculate pagination
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        users: uniqueUserRatings,
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
    console.error('Get store users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get detailed statistics
router.get('/statistics', async (req, res) => {
  try {
    // Find store
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) {
      return;
    }

    // Get rating statistics
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
        }
      }
    ]);

    // Check if no ratings exist
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

    let stats = ratingStats[0];
    
    // Create rating distribution object
    let ratingDistribution = {
      1: 0, 
      2: 0, 
      3: 0, 
      4: 0, 
      5: 0
    };
    
    // Count ratings for each value
    for (let i = 0; i < stats.ratingDistribution.length; i++) {
      let rating = stats.ratingDistribution[i];
      ratingDistribution[rating]++;
    }

    // Get recent ratings
    const recentRatings = await Rating.find({ store: store._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Round average rating
    let averageRating = stats.averageRating * 10;
    averageRating = Math.round(averageRating);
    averageRating = averageRating / 10;

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address
        },
        averageRating: averageRating,
        totalRatings: stats.totalRatings,
        ratingDistribution: ratingDistribution,
        recentRatings: recentRatings
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

// Get store information
router.get('/store', async (req, res) => {
  try {
    // Find store
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) {
      return;
    }

    // Get rating statistics
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

    let averageRating = 0;
    let totalRatings = 0;

    if (ratingStats.length > 0) {
      let avgRating = ratingStats[0].averageRating;
      avgRating = avgRating * 10;
      avgRating = Math.round(avgRating);
      avgRating = avgRating / 10;
      averageRating = avgRating;
      
      totalRatings = ratingStats[0].totalRatings;
    }

    // Get owner details
    const owner = await User.findById(store.owner).select('name email');

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address,
          owner: owner,
          averageRating: averageRating,
          totalRatings: totalRatings,
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