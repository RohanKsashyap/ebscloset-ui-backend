const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
  },
  addresses: [{
    type: { type: String, default: 'Home' },
    fullName: String,
    address: String,
    city: String,
    postalCode: String,
    country: String,
    phone: String,
    isPrimary: { type: Boolean, default: false }
  }],
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  notes: [{
    category: { type: String, enum: ['preference', 'shipping', 'issue', 'other'], default: 'other' },
    message: String,
    isHighPriority: { type: Boolean, default: false },
    addedBy: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Password reset fields for admin accounts
  resetPasswordToken: {
    type: String,
    index: true
  },
  resetPasswordExpires: {
    type: Date
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);