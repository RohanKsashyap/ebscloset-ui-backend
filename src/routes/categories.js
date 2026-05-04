const { Router } = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');

const router = Router();

// Get all active categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get a single category by slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching category' });
  }
});

// Get products by category slug
router.get('/:slug/products', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const products = await Product.find({ categoryId: category._id }).populate('categoryId', 'name slug');
    res.json({ category, products });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products for category' });
  }
});

module.exports = router;
