const mongoose = require('mongoose');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { uploadImage } = require('../utils/imageUpload');

// Verify eligibility
exports.verifyEligibility = async (req, res) => {
  try {
    let { orderId, contact } = req.body;
    let productId = req.body.productId || req.params.productId;

    if (!orderId || !contact || !productId) {
      return res.status(400).json({ message: 'Order ID, Contact (Email/Phone), and Product ID are required' });
    }

    // Clean up orderId: remove # and AC- prefix if present
    orderId = orderId.trim().replace(/^#/, '').replace(/^AC-/i, '');

    // Try finding by _id first, then by orderId field
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    
    if (!order) {
      // Try finding by the custom orderId field (e.g. AC-...)
      // The prefix might have been stripped above, so we search both with and without prefix
      order = await Order.findOne({ 
        $or: [
          { orderId: orderId },
          { orderId: `AC-${orderId.toUpperCase()}` }
        ]
      });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please check your Order ID.' });
    }

    // Verify contact matches (Email or Phone)
    const contactMatches = order.customer.email.toLowerCase() === contact.toLowerCase().trim() || 
                           order.customer.phone.trim() === contact.trim();
    if (!contactMatches) {
      return res.status(403).json({ message: 'Contact information (Email/Phone) does not match this order.' });
    }

    // Verify name matches (Optional but requested by user for specific error)
    const customerName = req.body.customerName || req.body.name || '';
    if (customerName) {
      const nameOnOrder = order.customer.fullName.toLowerCase().trim();
      const nameProvided = customerName.toLowerCase().trim();
      if (!nameOnOrder.includes(nameProvided) && !nameProvided.includes(nameOnOrder)) {
         return res.status(403).json({ message: 'The name provided does not match the name on the order.' });
      }
    }

    // Verify order is delivered
    if (order.status !== 'delivered') {
      return res.status(403).json({ message: 'Reviews can only be submitted for delivered orders' });
    }

    // Find the actual product to handle legacy ID vs MongoDB _id
    const productDoc = await Product.findById(productId) || await Product.findOne({ id: productId });
    if (!productDoc) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Verify product is in the order
    // We check against both the MongoDB _id and the legacy numeric id
    const searchIds = [productDoc._id.toString()];
    if (productDoc.id) searchIds.push(productDoc.id.toString());

    const productInOrder = order.products.some(p => p.productId && searchIds.includes(p.productId.toString()));
    
    if (!productInOrder) {
      return res.status(403).json({ message: 'Product not found in this order' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ orderId: order._id, productId: productDoc._id });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' });
    }

    res.json({ eligible: true, customerName: order.customer.fullName });
  } catch (err) {
    res.status(500).json({ message: 'Error verifying eligibility', error: err.message });
  }
};

// Submit review
exports.submitReview = async (req, res) => {
  try {
    let { orderId, contact, rating, headline } = req.body;
    let productId = req.body.productId || req.params.productId;
    
    // Support both frontend and backend naming conventions
    const customerName = req.body.customerName || req.body.name || 'Guest';
    const reviewText = req.body.reviewText || req.body.comment;

    if (!reviewText) {
      return res.status(400).json({ message: 'Review narrative is required.' });
    }

    let isVerifiedPurchase = false;
    let customerEmail = req.body.email || req.body.customerEmail;

    if (!orderId || !contact) {
      return res.status(403).json({ message: 'Order ID and Contact info (Email/Phone) are required to verify your purchase.' });
    }

    // Clean up orderId: remove # and AC- prefix if present
    orderId = orderId.trim().replace(/^#/, '').replace(/^AC-/i, '');

    // Try finding by _id first, then by orderId field
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    
    if (!order) {
      // Try finding by the custom orderId field (e.g. AC-...)
      order = await Order.findOne({ 
        $or: [
          { orderId: orderId },
          { orderId: `AC-${orderId.toUpperCase()}` }
        ]
      });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please check your Order ID.' });
    }

    // Check if order matches contact (Email or Phone)
    const contactMatches = order.customer.email.toLowerCase() === contact.toLowerCase().trim() || 
                           order.customer.phone.trim() === contact.trim();
    if (!contactMatches) {
      return res.status(403).json({ message: 'Contact information (Email/Phone) does not match this order.' });
    }

    // Check if name matches (Optional but requested by user for specific error)
    const nameOnOrder = order.customer.fullName.toLowerCase().trim();
    const nameProvided = customerName.toLowerCase().trim();
    if (!nameOnOrder.includes(nameProvided) && !nameProvided.includes(nameOnOrder)) {
       return res.status(403).json({ message: 'The name provided does not match the name on the order.' });
    }

    // Check delivery status
    if (order.status !== 'delivered') {
      return res.status(403).json({ message: 'You can only review products from delivered orders.' });
    }

    // Find the actual product to handle legacy ID vs MongoDB _id
    const productDoc = await Product.findById(productId) || await Product.findOne({ id: productId });
    if (!productDoc) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if product was in this order
    // We check against both the MongoDB _id and the legacy numeric id
    const searchIds = [productDoc._id.toString()];
    if (productDoc.id) searchIds.push(productDoc.id.toString());

    const productInOrder = order.products.some(p => p.productId && searchIds.includes(p.productId.toString()));
    
    if (!productInOrder) {
      return res.status(403).json({ message: 'This product was not found in the specified order.' });
    }

    // Success - Verified
    isVerifiedPurchase = true;
    customerEmail = order.customer.email;
    
    // Prevent duplicate reviews for the same order+product
    const existingReview = await Review.findOne({ orderId: order._id, productId: productDoc._id });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order.' });
    }

    const images = [];
    if (req.files) {
      if (req.files.images) {
        const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        for (const file of imageFiles) {
          const result = await uploadImage(file, 'ebs-closet/reviews');
          images.push(result.url);
        }
      }
    }

    let videoUrl = '';
    if (req.files && req.files.video) {
      const result = await uploadImage(req.files.video, 'ebs-closet/reviews');
      videoUrl = result.url;
    }

    const review = await Review.create({
      productId: productDoc._id,
      orderId: order._id,
      customerName,
      customerEmail,
      headline,
      rating,
      reviewText,
      status: 'pending',
      source: 'customer',
      ipAddress: req.ip,
      isVerifiedPurchase,
      images,
      video: videoUrl
    });

    res.status(201).json({ message: 'Review submitted for approval', review });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting review', error: err.message });
  }
};

// Get reviews for a product (Approved only)
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId, status: 'approved' })
      .select('-customerEmail -ipAddress')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

// Admin: Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).populate('productId', 'name image category');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all reviews' });
  }
};

// Admin: Update review status/text
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewText, rating } = req.body;
    
    const review = await Review.findByIdAndUpdate(id, { status, reviewText, rating }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: 'Error updating review' });
  }
};

// Admin: Delete review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await Review.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting review' });
  }
};

// Admin: Add manual review
exports.addAdminReview = async (req, res) => {
  try {
    const { productId, customerName, customerEmail, headline, rating, reviewText } = req.body;
    
    const images = [];
    if (req.files) {
      if (req.files.images) {
        const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        for (const file of imageFiles) {
          const result = await uploadImage(file, 'ebs-closet/reviews');
          images.push(result.url);
        }
      }
    }

    let videoUrl = '';
    if (req.files && req.files.video) {
      const result = await uploadImage(req.files.video, 'ebs-closet/reviews');
      videoUrl = result.url;
    }

    const review = await Review.create({
      productId,
      customerName,
      customerEmail: customerEmail || 'admin-added@ebscloset.com',
      headline,
      rating,
      reviewText,
      status: 'approved',
      source: 'admin',
      isVerifiedPurchase: false,
      images,
      video: videoUrl
    });
    
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: 'Error adding review' });
  }
};

// Get average rating for a product
exports.getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;
    const stats = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      { $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return res.json({ averageRating: 0, reviewCount: 0 });
    }
    
    res.json({
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating rating' });
  }
};
