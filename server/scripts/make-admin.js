require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model');
const connectDB = require('../src/config/db');

const email = process.argv[2] || 'admin@admin.com';
const password = process.argv[3] || 'admin1234';
const username = process.argv[4] || 'admin';

const run = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.role = 'admin';
      existing.username = username;
      if (password) {
        existing.password = await bcrypt.hash(password, 12);
      }
      await existing.save();
      console.log(`Updated existing user to admin: ${existing.email}`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'admin',
    });

    console.log(`Created admin user: ${user.email}`);
    console.log(`Username: ${user.username}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin user:', error.message);
    process.exit(1);
  }
};

run();
