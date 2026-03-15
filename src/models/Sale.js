const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  products: [{
    productId: String,
    title: String,
    price: Number,
    quantity: Number,
    variantName: String
  }],
  customer: {
    fullName: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String,
    country: String
  },
  paymentMethod: String,
  totalAmount: Number,
  saleDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
