const Store = require('../models/Store');
const Rating = require('../models/Rating');
const User = require('../models/User');

// Helper function
const findStoreByOwner = async (userId, res) => {
  const store = await Store.findOne({ owner: userId, isActive: true });
  if (!store) {
    res.status(403).json({
      success: false,
      message: 'Access denied: No active store found for this user.'
    });
    return null;
  }
  return store;
};

// Get dashboard
exports.getDashboard = async (req, res) => {
  try {
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) return;

    const ratingStats = await Rating.aggregate([
      { $match: { store: store._id } },
      {
        $group: {
          _id: '$store',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratings: { $push: { rating: '$rating', review: '$review', createdAt: '$createdAt', updatedAt: '$updatedAt' } }
        }
      }
    ]);

    let stats = ratingStats.length > 0 ? ratingStats[0] : { averageRating: 0, totalRatings: 0, ratings: [] };
    
    stats.ratings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const recentRatings = stats.ratings.slice(0, 5);

    let averageRating = Math.round((stats.averageRating || 0) * 10) / 10;

    res.json({
      success: true,
      data: {
        store: { id: store._id, name: store.name, email: store.email, address: store.address },
        averageRating,
        totalRatings: stats.totalRatings,
        recentRatings
      }
    });
  } catch (error) {
    console.error('Store owner dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get ratings
exports.getRatings = async (req, res) => {
  try {
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) return;

    let { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    sortOrder = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const ratings = await Rating.find({ store: store._id })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    const total = await Rating.countDocuments({ store: store._id });
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        store: { id: store._id, name: store.name, email: store.email, address: store.address },
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
    console.error('Get store ratings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get users who rated
exports.getUsersWhoRated = async (req, res) => {
  try {
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) return;

    let { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    sortOrder = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const sortField = `lastRating.${sortBy}`;
    const sortObject = { [sortField]: sortOrder };

    const uniqueUserRatings = await Rating.aggregate([
      { $match: { store: store._id } },
      { $group: { _id: '$user', lastRating: { $last: '$ROOT' }, ratingCount: { $sum: 1 } } },
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

    const totalResult = await Rating.aggregate([
      { $match: { store: store._id } },
      { $group: { _id: '$user' } },
      { $count: 'total' }
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        store: { id: store._id, name: store.name, email: store.email, address: store.address },
        users: uniqueUserRatings,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get store users error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) return;

    const ratingStats = await Rating.aggregate([
      { $match: { store: store._id } },
      {
        $group: {
          _id: '$store',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: { $push: '$rating' }
        }
      }
    ]);

    if (ratingStats.length === 0) {
      return res.json({
        success: true,
        data: {
          store: { id: store._id, name: store.name, email: store.email, address: store.address },
          averageRating: 0,
          totalRatings: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recentRatings: []
        }
      });
    }

    let stats = ratingStats[0];
    let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    stats.ratingDistribution.forEach(rating => {
      ratingDistribution[rating]++;
    });

    const recentRatings = await Rating.find({ store: store._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    let averageRating = Math.round((stats.averageRating || 0) * 10) / 10;

    res.json({
      success: true,
      data: {
        store: { id: store._id, name: store.name, email: store.email, address: store.address },
        averageRating,
        totalRatings: stats.totalRatings,
        ratingDistribution,
        recentRatings
      }
    });
  } catch (error) {
    console.error('Get store statistics error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get store info
exports.getStoreInfo = async (req, res) => {
  try {
    const store = await findStoreByOwner(req.user.id, res);
    if (!store) return;

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
      averageRating = Math.round((ratingStats[0].averageRating || 0) * 10) / 10;
      totalRatings = ratingStats[0].totalRatings;
    }

    const owner = await User.findById(store.owner).select('name email');

    res.json({
      success: true,
      data: {
        store: {
          id: store._id,
          name: store.name,
          email: store.email,
          address: store.address,
          owner,
          averageRating,
          totalRatings,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get store info error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};