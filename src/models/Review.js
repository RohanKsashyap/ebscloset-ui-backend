const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }, // Nullable for admin-added reviews
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true }, // Hidden from public
  headline: { type: String }, // Optional summary
  rating: { type: Number, required: true, min: 1, max: 5 },
  reviewText: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  source: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  ipAddress: { type: String },
  isVerifiedPurchase: { type: Boolean, default: false }
}, { timestamps: true });

// Prevent duplicate reviews for the same order and product
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true, partialFilterExpression: { orderId: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Review', reviewSchema);
