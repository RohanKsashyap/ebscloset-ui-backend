// routes/products.js
const { Router } = require('express');
const Product = require('../models/Product');
const reviewController = require('../controllers/reviewController');

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('categoryId', 'name slug');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get trending products
router.get('/trending', async (req, res) => {
  try {
    const products = await Product.find({ trending: true }).limit(8).populate('categoryId', 'name slug');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get bestseller products

router.get('/bestseller', async (req, res) => {
  try {
    const products = await Product.find({ bestseller: true }).limit(8).populate('categoryId', 'name slug');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});






// Get new arrivals
router.get('/new-arrivals', async (req, res) => {
  try {
    const products = await Product.find({ newarrival: true }).sort({ createdAt: -1 }).limit(8).populate('categoryId', 'name slug');
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a product by ID
router.get('/:id', async (req, res) => {
  try {
    // Check if ID is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    let product;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    } else {
      // Fallback for numeric IDs if they are stored in a specific field or if we want to handle them gracefully
      product = await Product.findOne({ id: req.params.id }).populate('categoryId', 'name slug');
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit a review for a product
router.post('/:productId/reviews', reviewController.submitReview);

module.exports = router;
