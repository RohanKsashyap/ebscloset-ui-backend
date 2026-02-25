// routes/products.js
const { Router } = require('express');
const Product = require('../models/Product');

const router = Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('categoryId', 'name slug');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get a product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name slug');
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
