const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    
    minlength: [3, 'Name must be at least 3 characters'], 
    maxlength: [60, 'Name cannot exceed 60 characters'],
    trim: true
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    maxlength: [128, 'Password cannot exceed 128 characters'],
    select: false 
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    maxlength: [400, 'Address cannot exceed 400 characters'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'store_owner'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


userSchema.pre('validate', function(next) {
  if (this.isModified('password') && this.password) {
    
    const isBcryptHash = /^\$2[ayb]\$.{56}$/.test(this.password);
    
    if (!isBcryptHash) {
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
      
      
      if (!passwordRegex.test(this.password)) {
        this.invalidate('password', 'Password must contain at least one uppercase letter and one special character');
      }
      
      
      if (this.password.length < 8 || this.password.length > 16) {
        this.invalidate('password', 'Password must be between 8 and 16 characters');
      }
    }
  }
  next();
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  
  const isBcryptHash = /^\$2[ayb]\$.{56}$/.test(this.password);
  if (isBcryptHash) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});


userSchema.methods.comparePassword = async function(candidatePassword) {
 
  return await bcrypt.compare(candidatePassword, this.password);
};


userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
