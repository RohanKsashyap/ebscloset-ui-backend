// routes/products.js
const { Router } = require('express');
const Product = require('../models/Product');
const reviewController = require('../controllers/reviewController');

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, age, categoryId } = req.query;
    const filter = {};
    
    if (category) {
      filter.category = category;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }
    
    if (age) {
      filter.ageGroups = age;
    }
    
    const products = await Product.find(filter).populate('categoryId', 'name slug');
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

// Get a product by ID or Slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Review = require('../models/Review');
    const { idOrSlug } = req.params;
    let product;
    
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      product = await Product.findById(idOrSlug).populate('categoryId', 'name slug');
    } else {
      // Try finding by legacy numeric id (if it's a number) or slug
      const isNumeric = !isNaN(idOrSlug) && !isNaN(parseFloat(idOrSlug));
      const query = isNumeric 
        ? { $or: [{ id: Number(idOrSlug) }, { slug: idOrSlug }] }
        : { slug: idOrSlug };
        
      product = await Product.findOne(query).populate('categoryId', 'name slug');
    }

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Fetch approved reviews for this product
    const reviews = await Review.find({ 
      productId: product._id, 
      status: 'approved' 
    }).sort({ createdAt: -1 });

    // Map reviews to match frontend expectations if necessary
    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      name: r.customerName,
      rating: r.rating,
      comment: r.reviewText,
      headline: r.headline,
      date: r.createdAt.toISOString().slice(0, 10),
      images: r.images,
      video: r.video
    }));

    const productObj = product.toObject();
    productObj.reviews = formattedReviews;

    res.json({ product: productObj });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Submit a review for a product
router.post('/:productId/reviews', reviewController.submitReview);

module.exports = router;
