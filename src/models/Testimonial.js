const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  tag: {
    type: String,
    trim: true
  },
  avatarUrl: {
    type: String
  },
  avatarId: {
    type: String
  },
  product: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['visible', 'hidden'],
    default: 'visible'
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

testimonialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
