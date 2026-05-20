const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  image: { type: String, default: '' },
  imageId: { type: String, default: '' },
  author: { type: String, default: 'Admin' },
  category: { type: String, default: 'Journal' },
  tags: [{ type: String }],
  published: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
