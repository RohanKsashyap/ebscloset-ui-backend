const { Router } = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');

const router = Router();

// Get all active categories (flat list, populated with parent info)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get hierarchical categories — 2 levels deep:
// Level 1: top-level parents (nav items)
// Level 2: group subcategories (column headers in mega menu)
// Level 3: items inside each group (links listed under headers)
router.get('/tree', async (req, res) => {
  try {
    const all = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    const byId = {};
    all.forEach(c => { byId[c._id.toString()] = c.toObject(); });

    // Level-1: true root parents
    const parents = all.filter(c => !c.parentCategory);

    const tree = parents.map(p => {
      const pid = p._id.toString();

      // Level-2: direct children of p (column groups)
      const groups = all
        .filter(c => c.parentCategory && c.parentCategory.toString() === pid)
        .map(g => {
          const gid = g._id.toString();

          // Level-3: children of each group (leaf items)
          const items = all
            .filter(c => c.parentCategory && c.parentCategory.toString() === gid)
            .map(i => ({ _id: i._id, name: i.name, slug: i.slug, displayOrder: i.displayOrder }));

          return {
            _id: g._id,
            name: g.name,
            slug: g.slug,
            displayOrder: g.displayOrder,
            items,             // leaf links shown beneath the column header
          };
        });

      return {
        ...p.toObject(),
        subcategories: groups,  // column headers
      };
    });

    res.json(tree);
  } catch (err) {
    console.error('Error fetching category tree:', err);
    res.status(500).json({ message: 'Error fetching category tree' });
  }
});

// Get a single category by slug
router.get('/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, isActive: true })
      .populate('parentCategory', 'name slug');
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
