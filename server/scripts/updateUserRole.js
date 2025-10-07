const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// Import User model
const User = require('../models/User');

const updateUserRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Rating');
    console.log('Connected to MongoDB');

    // Update your user role
    const result = await User.findOneAndUpdate(
      { email: 'arpityadav58571@gmail.com' },
      { role: 'store_owner' },
      { new: true }
    );

    if (result) {
      console.log('✅ User role updated successfully!');
      console.log('Updated user:', {
        name: result.name,
        email: result.email,
        role: result.role
      });
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Run the script
updateUserRole();

