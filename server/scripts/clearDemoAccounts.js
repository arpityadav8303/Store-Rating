const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// Import User model
const User = require('../models/User');

const clearDemoAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/store-rating-system');
    console.log('Connected to MongoDB');

    // Clear demo accounts
    const demoEmails = ['admin@example.com', 'user@example.com', 'owner@example.com'];
    const result = await User.deleteMany({
      email: { $in: demoEmails }
    });
    
    console.log(`✅ Removed ${result.deletedCount} demo accounts`);
    console.log('Database is now clean and ready for your own registrations!');

  } catch (error) {
    console.error('Error clearing demo accounts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Run the script
clearDemoAccounts();

