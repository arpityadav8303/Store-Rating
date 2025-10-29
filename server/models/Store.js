const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true,
    minlength: [3, 'Store name must be at least 3 characters'],
    maxlength: [100, 'Store name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    maxlength: [400, 'Address cannot exceed 400 characters'],
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: false },
  toObject: { virtuals: false }
});

// Compound index for faster queries (owner + isActive)
storeSchema.index({ owner: 1, isActive: 1 });

// Update updatedAt field before saving
storeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Store', storeSchema);

