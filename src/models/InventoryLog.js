const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  variantName: { type: String, default: null },
  change: { type: Number, required: true }, // negative for decrement, positive for increment
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: { type: String, enum: ['order-delivered', 'admin-adjustment', 'product-edit', 'order-placed', 'order-returned', 'order-cancelled', 'other'], default: 'other' },
  meta: { type: Object, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);