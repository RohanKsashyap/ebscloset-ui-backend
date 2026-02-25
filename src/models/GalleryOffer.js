const mongoose = require('mongoose');

const galleryOfferSchema = new mongoose.Schema({
  variant: {
    type: String,
    required: true,
    trim: true
  },
  title1: {
    type: String,
    required: true,
    trim: true
  },
  title2: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  imageId: {
    type: String,
    default: ''
  },
  thumbnailUrl: {
    type: String
  },
  campaign: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  link: {
    type: String,
    default: '/products'
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

// Update the updatedAt field on save
galleryOfferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('GalleryOffer', galleryOfferSchema);
