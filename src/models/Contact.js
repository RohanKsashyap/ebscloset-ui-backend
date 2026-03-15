const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  subject: { 
    type: String, 
    required: true, 
    enum: ['general', 'order', 'product', 'wholesale', 'feedback', 'service'],
    lowercase: true,
    trim: true
  },
  service: { type: String, trim: true },
  message: { type: String, required: true, minlength: 10 },
  status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);