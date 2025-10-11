const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Store = require('../models/Store');
const Rating = require('../models/Rating');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes need authentication
router.use(protect);

// Get all stores
router.get('/stores', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['name', 'address', 'averageRating', 'createdAt']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('search').optional().isString().withMessage('Search must be a string')
], async (req, res) => {
  try {
    // Check if there are validation errors
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

    // Create filter for active stores only
    let filter = { isActive: true };

    // Add search if provided
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    let skip = (page - 1) * limit;

    let stores;
    let total;

    // Check if sorting by average rating
    if (sortBy === 'averageRating') {
      // Count total stores first
      const totalCountPipeline = [
        { $match: filter },
        { $count: "total" }
      ];
      const totalResult = await Store.aggregate(totalCountPipeline);
      if (totalResult.length > 0) {
        total = totalResult[0].total;
      } else {
        total = 0;
      }

      // Get stores with aggregation
      stores = await Store.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'ratings',
            localField: '_id',
            foreignField: 'store',
            as: 'ratings'
          }
        },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: '$ratings' }, 0] },
                then: { $avg: '$ratings.rating' },
                else: 0
              }
            },
            totalRatings: { $size: '$ratings' }
          }
        },
        { $sort: { averageRating: sortOrder } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'owner',
            foreignField: '_id',
            as: 'owner'
          }
        },
        { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            ratings: 0,
            'owner.password': 0
          }
        }
      ]);
      
    } else {
      // Normal find for other sorting options
      let sortObj = {};
      sortObj[sortBy] = sortOrder;

      stores = await Store.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email')
        .lean();

      total = await Store.countDocuments(filter);
      
      // Get ratings for these stores
      let storeIds = [];
      for (let i = 0; i < stores.length; i++) {
        storeIds.push(stores[i]._id);
      }

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

      // Create a map of ratings
      let averageRatingsMap = {};
      for (let i = 0; i < averageRatings.length; i++) {
        let rating = averageRatings[i];
        let storeIdString = rating._id.toString();
        averageRatingsMap[storeIdString] = {
          averageRating: Math.round(rating.averageRating * 10) / 10,
          totalRatings: rating.totalRatings
        };
      }

      // Add ratings to stores
      let storesWithRatings = [];
      for (let i = 0; i < stores.length; i++) {
        let store = stores[i];
        let storeIdString = store._id.toString();
        let ratingData = averageRatingsMap[storeIdString];
        
        let newStore = { ...store };
        if (ratingData) {
          newStore.averageRating = ratingData.averageRating;
          newStore.totalRatings = ratingData.totalRatings;
        } else {
          newStore.averageRating = 0;
          newStore.totalRatings = 0;
        }
        
        storesWithRatings.push(newStore);
      }
      stores = storesWithRatings;
    }

    // Get current user's ratings for these stores
    let currentStoreIds = [];
    for (let i = 0; i < stores.length; i++) {
      currentStoreIds.push(stores[i]._id);
    }
    
    const userRatings = await Rating.find({
      user: req.user.id,
      store: { $in: currentStoreIds }
    }).lean();

    // Create map of user ratings
    let userRatingsMap = {};
    for (let i = 0; i < userRatings.length; i++) {
      let rating = userRatings[i];
      let storeIdString = rating.store.toString();
      userRatingsMap[storeIdString] = rating;
    }

    // Add user ratings to stores
    let finalStores = [];
    for (let i = 0; i < stores.length; i++) {
      let store = stores[i];
      let storeIdString = store._id.toString();
      
      let avgRating = store.averageRating;
      if (!avgRating) {
        avgRating = 0;
      }
      avgRating = Math.round(avgRating * 10) / 10;
      
      let userRating = userRatingsMap[storeIdString];
      if (!userRating) {
        userRating = null;
      }
      
      let finalStore = {
        ...store,
        averageRating: avgRating,
        userRating: userRating
      };
      
      finalStores.push(finalStore);
    }

    // Calculate pagination info
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        stores: finalStores,
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

// Submit or update a rating
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
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const rating = req.body.rating;
    const review = req.body.review;
    const storeId = req.params.storeId;

    // Check if store ID is valid
    const isValidId = storeId.match(/^[0-9a-fA-F]{24}$/);
    if (!isValidId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID format'
      });
    }

    // Find the store
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or is not active'
      });
    }
    if (!store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or is not active'
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
      if (review !== undefined) {
        existingRating.review = review;
      }
      ratingDoc = await existingRating.save();
      message = 'Rating updated successfully';
    } else {
      // Create new rating
      let newRatingData = {
        user: req.user.id,
        store: storeId,
        rating: rating
      };
      
      if (review) {
        newRatingData.review = review;
      } else {
        newRatingData.review = '';
      }
      
      ratingDoc = await Rating.create(newRatingData);
      message = 'Rating submitted successfully';
    }

    // Populate user and store data
    await ratingDoc.populate([
      { path: 'user', select: 'name email' },
      { path: 'store', select: 'name email address' }
    ]);

    res.json({
      success: true,
      message: message,
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

// Get user's ratings
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

    // Get query params
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

    let skip = (page - 1) * limit;

    // Create sort object
    let sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Find user's ratings
    const ratings = await Rating.find({ user: req.user.id })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('store', 'name email address')
      .lean();

    // Count total ratings
    const total = await Rating.countDocuments({ user: req.user.id });

    // Calculate pagination
    let totalPages = Math.ceil(total / limit);
    let hasNextPage = page < totalPages;
    let hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
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
    console.error('Get user ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete a rating
router.delete('/ratings/:ratingId', async (req, res) => {
  try {
    // Check if rating ID is valid
    const isValidId = req.params.ratingId.match(/^[0-9a-fA-F]{24}$/);
    if (!isValidId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rating ID format'
      });
    }

    // Find the rating
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

    // Delete the rating
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

// Get store details
router.get('/stores/:storeId', async (req, res) => {
  try {
    // Validate store ID
    const isValidId = req.params.storeId.match(/^[0-9a-fA-F]{24}$/);
    if (!isValidId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID format'
      });
    }

    // Find store
    const store = await Store.findById(req.params.storeId)
      .populate('owner', 'name email')
      .lean();

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
    }).lean();

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

    // Get all ratings for this store
    const allRatings = await Rating.find({ store: store._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Prepare response
    let averageRating = 0;
    let totalRatings = 0;
    
    if (ratingStats.length > 0) {
      averageRating = Math.round(ratingStats[0].averageRating * 10) / 10;
      totalRatings = ratingStats[0].totalRatings;
    }

    const storeWithRatings = {
      ...store,
      userRating: userRating,
      averageRating: averageRating,
      totalRatings: totalRatings,
      recentRatings: allRatings
    };

    res.json({
      success: true,
      data: storeWithRatings
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

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    
    const user = await User.findById(req.user.id).select('-password').lean(); 

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    
    const ratingCount = await Rating.countDocuments({ user: user._id });
    
    
    const userRatings = await Rating.find({ user: user._id })
      .populate('store', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          address: user.address,
          role: user.role,
          createdAt: user.createdAt
        },
        statistics: {
          totalRatings: ratingCount
        },
        recentRatings: userRatings
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;