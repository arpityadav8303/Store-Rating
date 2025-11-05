const User = require('../models/User');
const Store = require('../models/Store');
const Rating = require('../models/Rating');

// Get admin dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalStores = await Store.countDocuments({ isActive: true });
    const totalRatings = await Rating.countDocuments();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStores,
        totalRatings
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
};

// Get all users with filtering and sorting
exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', search, role } = req.query;
    
    page = parseInt(page);
    limit = parseInt(limit);
    sortOrder = sortOrder === 'asc' ? 1 : -1;

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

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const users = await User.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-password');

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users,
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
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all stores with filtering and sorting
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
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sortObj = { [sortBy]: sortOrder };

    const stores = await Store.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate('owner', 'name email')
      .lean();

    // Add ratings to each store
    const storesWithRatings = await Promise.all(stores.map(async (store) => {
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

      let avgRating = 0;
      let totalRatings = 0;
      if (ratingStats.length > 0) {
        avgRating = Math.round(ratingStats[0].averageRating * 10) / 10;
        totalRatings = ratingStats[0].totalRatings;
      }

      return { ...store, averageRating: avgRating, totalRatings };
    }));

    const total = await Store.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        stores: storesWithRatings,
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

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, address, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      address,
      role,
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
};

// Create new store
exports.createStore = async (req, res) => {
  try {
    const { name, email, address, ownerName } = req.body;

    const existingStore = await Store.findOne({ email });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: 'Store already exists with this email'
      });
    }

    const owner = await User.findOne({ 
      name: { $regex: ownerName, $options: 'i' }, 
      role: 'store_owner' 
    });
    
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: `Store owner "${ownerName}" not found. Please ensure the full name is correct.`
      });
    }

    const store = await Store.create({
      name,
      email,
      address,
      owner: owner._id
    });

    await store.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store
    });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update store
exports.updateStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const allowedUpdates = ['name', 'email', 'address', 'isActive'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        store[key] = req.body[key];
      }
    });

    if (req.body.ownerId) {
      store.owner = req.body.ownerId;
    }

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
};

// Get user details by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user.toObject()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const allowedUpdates = ['name', 'email', 'address', 'role', 'isActive'];
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        user[key] = req.body[key];
      }
    });

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
};

// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
};

// Delete store (soft delete)
exports.deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

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
};