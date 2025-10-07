const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Store = require('../models/Store');
const Rating = require('../models/Rating');
const { protect, isUser } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all stores for normal users
// @route   GET /api/user/stores
// @access  Private (Authenticated users)
router.get('/stores', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'address', 'averageRating', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('search').optional().isString().withMessage('Search must be a string')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const search = req.query.search;

    // Build filter object
    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get stores with pagination and sorting
    const stores = await Store.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email');

    // Get user's ratings for these stores
    const storeIds = stores.map(store => store._id);
    const userRatings = await Rating.find({
      user: req.user.id,
      store: { $in: storeIds }
    });

    // Create a map of user ratings by store ID
    const userRatingsMap = {};
    userRatings.forEach(rating => {
      userRatingsMap[rating.store.toString()] = rating;
    });

    // Get average ratings for all stores
    const averageRatings = await Rating.aggregate([
      { $match: { store: { $in: storeIds } } },
      {
        $group: {
          _id: '$store',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    // Create a map of average ratings by store ID
    const averageRatingsMap = {};
    averageRatings.forEach(rating => {
      averageRatingsMap[rating._id.toString()] = {
        averageRating: Math.round(rating.averageRating * 10) / 10,
        totalRatings: rating.totalRatings
      };
    });

    // Add user ratings and average ratings to stores
    const storesWithRatings = stores.map(store => {
      const storeObj = store.toObject();
      storeObj.userRating = userRatingsMap[store._id.toString()] || null;
      storeObj.averageRating = averageRatingsMap[store._id.toString()]?.averageRating || 0;
      storeObj.totalRatings = averageRatingsMap[store._id.toString()]?.totalRatings || 0;
      return storeObj;
    });

    // Get total count
    const total = await Store.countDocuments(filter);

    res.json({
      success: true,
      data: {
        stores: storesWithRatings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalStores: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
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

// @desc    Submit or update rating for a store
// @route   POST /api/user/stores/:storeId/rate
// @access  Private (Authenticated users)
router.post('/stores/:storeId/rate', [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('review')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Review cannot exceed 500 characters')
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

    const { rating, review } = req.body;
    const storeId = req.params.storeId;

    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Check if store is active
    if (!store.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Store is not active'
      });
    }

    // Check if user already rated this store
    const existingRating = await Rating.findOne({
      user: req.user.id,
      store: storeId
    });

    let ratingDoc;
    let message;

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review || existingRating.review;
      ratingDoc = await existingRating.save();
      message = 'Rating updated successfully';
    } else {
      // Create new rating
      ratingDoc = await Rating.create({
        user: req.user.id,
        store: storeId,
        rating,
        review
      });
      message = 'Rating submitted successfully';
    }

    // Populate the rating with user and store info
    await ratingDoc.populate([
      { path: 'user', select: 'name email' },
      { path: 'store', select: 'name email address' }
    ]);

    res.json({
      success: true,
      message,
      data: ratingDoc
    });
  } catch (error) {
    console.error('Rate store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get user's ratings
// @route   GET /api/user/ratings
// @access  Private (Authenticated users)
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get user's ratings with pagination and sorting
    const ratings = await Rating.find({ user: req.user.id })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('store', 'name email address');

    // Get total count
    const total = await Rating.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: {
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
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete user's rating
// @route   DELETE /api/user/ratings/:ratingId
// @access  Private (Authenticated users)
router.delete('/ratings/:ratingId', async (req, res) => {
  try {
    const rating = await Rating.findOne({
      _id: req.params.ratingId,
      user: req.user.id
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found or you do not have permission to delete it'
      });
    }

    await Rating.findByIdAndDelete(rating._id);

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    console.error('Delete rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get store details with user's rating
// @route   GET /api/user/stores/:storeId
// @access  Private (Authenticated users)
router.get('/stores/:storeId', async (req, res) => {
  try {
    const store = await Store.findById(req.params.storeId)
      .populate('owner', 'name email');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    if (!store.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Store is not active'
      });
    }

    // Get user's rating for this store
    const userRating = await Rating.findOne({
      user: req.user.id,
      store: store._id
    });

    // Get average rating and total ratings
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

    const storeObj = store.toObject();
    storeObj.userRating = userRating;
    storeObj.averageRating = ratingStats.length > 0 ? Math.round(ratingStats[0].averageRating * 10) / 10 : 0;
    storeObj.totalRatings = ratingStats.length > 0 ? ratingStats[0].totalRatings : 0;

    res.json({
      success: true,
      data: storeObj
    });
  } catch (error) {
    console.error('Get store details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;

