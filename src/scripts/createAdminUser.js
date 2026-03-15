const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const MONGO_URI= 'mongodb://localhost:27017/ebs-localmongodb'
// Connect to MongoDB
mongoose.connect(`${MONGO_URI}`)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Admin user data
const adminData = {
  email: 'roy282227@gmail.com',
  password: 'admin123',
  fullName: 'ebs_closet_admin',
  role: 'admin'
};

async function createAdminUser() {
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create new admin user
    const adminUser = new User(adminData);
    await adminUser.save();
    
    console.log('Admin user created successfully');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();