const Store = require('../models/Store');
const Rating = require('../models/Rating');
const User = require('../models/User');

// Get all stores
exports.getAllStores = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    sortOrder = sortOrder === 'asc' ? 1 : -1;

    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    let stores;

    if (sortBy === 'averageRating') {
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
              $cond: [
                { $gt: [{ $size: '$ratings' }, 0] },
                { $avg: '$ratings.rating' },
                0
              ]
            },
            totalRatings: { $size: '$ratings' }
          }
        },
        { $sort: { averageRating: sortOrder } },
        { $skip: skip },
        { $limit: limit }
      ]);
    } else {
      const sortObj = { [sortBy]: sortOrder };
      stores = await Store.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email')
        .lean();

      // Add ratings
      const storeIds = stores.map(s => s._id);
      const ratings = await Rating.aggregate([
        { $match: { store: { $in: storeIds } } },
        {
          $group: {
            _id: '$store',
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]);

      const ratingsMap = {};
      ratings.forEach(r => {
        ratingsMap[r._id.toString()] = {
          averageRating: Math.round(r.averageRating * 10) / 10,
          totalRatings: r.totalRatings
        };
      });

      stores = stores.map(store => ({
        ...store,
        averageRating: ratingsMap[store._id.toString()]?.averageRating || 0,
        totalRatings: ratingsMap[store._id.toString()]?.totalRatings || 0
      }));
    }

    const total = await Store.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        stores,
        pagination: {
          currentPage: page,
          totalPages,
          totalStores: total,
          hasNextPage: page < totalPages,
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
};

// Submit or update a rating
exports.rateStore = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const { storeId } = req.params;

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or is not active'
      });
    }

    let ratingDoc;
    let message;

    const existingRating = await Rating.findOne({
      user: req.user.id,
      store: storeId
    });

    if (existingRating) {
      existingRating.rating = rating;
      if (review !== undefined) {
        existingRating.review = review;
      }
      ratingDoc = await existingRating.save();
      message = 'Rating updated successfully';
    } else {
      ratingDoc = await Rating.create({
        user: req.user.id,
        store: storeId,
        rating,
        review: review || ''
      });
      message = 'Rating submitted successfully';
    }

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
};

// Get user's ratings
exports.getUserRatings = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    sortOrder = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const ratings = await Rating.find({ user: req.user.id })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('store', 'name email address')
      .lean();

    const total = await Rating.countDocuments({ user: req.user.id });
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        ratings,
        pagination: {
          currentPage: page,
          totalPages,
          totalRatings: total,
          hasNextPage: page < totalPages,
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
};

// Delete a rating
exports.deleteRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({
      _id: req.params.ratingId,
      user: req.user.id
    });

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
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
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
};