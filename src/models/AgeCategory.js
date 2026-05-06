const mongoose = require('mongoose');

const ageCategorySchema = new mongoose.Schema({
  ageRange: { 
    type: String, 
    required: true,
    enum: ["0-1", "1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"]
  },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  mediaId: { type: String }, // For ImageKit deletion
  overlayOpacity: { type: Number, default: 45 },
  duration: { type: Number, default: 8.0 },
  transition: { type: String, default: 'Soft Fade' },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('AgeCategory', ageCategorySchema);
