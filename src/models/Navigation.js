const mongoose = require('mongoose');

const navigationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  link: { type: String, required: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isMegaMenu: { type: Boolean, default: false },
  subItems: [{
    name: String,
    link: String,
    displayOrder: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Navigation', navigationSchema);
