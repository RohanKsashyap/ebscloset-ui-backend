const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const Product = require('./src/models/Product');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const generateSlug = (name) => {
  const baseSlug = name.toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
  const random = crypto.randomBytes(3).toString('hex');
  return `${baseSlug}-${random}`;
};

(async () => {
  if (!MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find({ slug: { $exists: false } });
    console.log(`Found ${products.length} products without slugs`);

    let updated = 0;
    for (const p of products) {
      p.slug = generateSlug(p.name);
      await p.save();
      updated++;
      console.log(`Generated slug for product ${p._id}: ${p.slug}`);
    }

    // Also check for products with null/empty slugs
    const emptySlugs = await Product.find({ $or: [{ slug: null }, { slug: '' }] });
    console.log(`Found ${emptySlugs.length} products with empty slugs`);
    
    for (const p of emptySlugs) {
        p.slug = generateSlug(p.name);
        await p.save();
        updated++;
        console.log(`Generated slug for product ${p._id}: ${p.slug}`);
    }

    console.log(`Done. Updated ${updated} products.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
