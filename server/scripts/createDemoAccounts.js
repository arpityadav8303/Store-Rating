const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../config.env' });

// Import User model
const User = require('../models/User');

const createDemoAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/store-rating-system');
    console.log('Connected to MongoDB');

    // Demo accounts data
    const demoAccounts = [
      {
        name: 'System Administrator Account',
        email: 'admin@example.com',
        password: 'Admin123!',
        address: '123 Admin Street, Administrative District, City 12345',
        role: 'admin'
      },
      {
        name: 'Normal User Account for Testing',
        email: 'user@example.com',
        password: 'User123!',
        address: '456 User Avenue, Residential Area, City 67890',
        role: 'user'
      },
      {
        name: 'Store Owner Business Account',
        email: 'owner@example.com',
        password: 'Owner123!',
        address: '789 Business Boulevard, Commercial Zone, City 54321',
        role: 'store_owner'
      }
    ];

    // Clear existing demo accounts
    await User.deleteMany({
      email: { $in: demoAccounts.map(acc => acc.email) }
    });
    console.log('Cleared existing demo accounts');

    // Create new demo accounts
    for (const account of demoAccounts) {
      const user = new User(account);
      await user.save();
      console.log(`Created ${account.role} account: ${account.email}`);
    }

    console.log('\n✅ Demo accounts created successfully!');
    console.log('\nLogin credentials:');
    console.log('👑 Admin: admin@example.com / Admin123!');
    console.log('👤 User: user@example.com / User123!');
    console.log('🏪 Store Owner: owner@example.com / Owner123!');

  } catch (error) {
    console.error('Error creating demo accounts:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
};

// Run the script
createDemoAccounts();

