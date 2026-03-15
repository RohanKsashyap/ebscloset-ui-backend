// Migration: Link existing products.category (name) to Category documents via categoryId
// Usage:
//   node d:\WEBSITES\arlenco\backend\src\scripts\migrate-product-categories.js
//   or from backend root:
//   node d:\WEBSITES\arlenco\backend\migrate-product-categories.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./src/models/Product');
const Category = require('./src/models/Category');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
(async () => {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected');

    const categories = await Category.find();
    const byName = new Map(categories.map(c => [c.name, c]));

    const products = await Product.find();
    let updated = 0;

    for (const p of products) {
      if (p.categoryId) continue; // already linked
      const catName = p.category || 'Uncategorized';
      const cat = byName.get(catName);
      if (cat) {
        p.categoryId = cat._id;
        await p.save();
        updated++;
        console.log(`Linked product ${p._id} (${p.name}) -> ${cat.name}`);
      } else {
        console.warn(`No category match for product ${p._id} (${p.name}) with category '${catName}'`);
      }
    }

    console.log(`Done. Updated ${updated} products.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();