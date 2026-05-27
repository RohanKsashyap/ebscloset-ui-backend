const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  products: [{
    productId: String,
    title: String, 
    image: String,
    price: Number,
    quantity: Number,
    variantName: String,
    sku: String,
    color: String,
    variantId: String
  }],
  customer: {
    fullName: String,
    email: String,
    phone: String,
    address: String,
    suburb: String,
    state: String,
    city: String,
    postalCode: String,
    country: String
  },
  paymentMethod: String,
  subtotal: Number,
  shippingFee: Number,
  tax: Number,
  totalAmount: Number,
  orderId: { type: String, unique: true },
  status: { type: String, default: 'pending', lowercase: true, trim: true },
  stockDecremented: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
