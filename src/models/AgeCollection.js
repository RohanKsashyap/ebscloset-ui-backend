const mongoose = require('mongoose');

const ageCollectionSchema = new mongoose.Schema({
  ageGroup: {
    type: String,
    required: true,
    enum: ["0-1", "1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"]
  },
  mediaUrl: {
    type: String,
    required: true
  },
  mediaId: {
    type: String,
    required: false
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  headline: {
    type: String,
    default: ''
  },
  categoryLabel: {
    type: String,
    default: ''
  },
  subtext: {
    type: String,
    default: ''
  },
  overlayOpacity: {
    type: Number,
    default: 45
  },
  duration: {
    type: Number,
    default: 8.0
  },
  transition: {
    type: String,
    default: 'Soft Fade'
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('AgeCollection', ageCollectionSchema);
