require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // 1. Drop the unique index on name so subcategories can share display names
  try {
    await mongoose.connection.collection('categories').dropIndex('name_1');
    console.log('✅ Dropped name_1 unique index');
  } catch (e) {
    console.log('ℹ️  name_1 index not found (already dropped or never existed):', e.message);
  }

  // 2. Remove all subcategories (any category with a parentCategory set)
  //    — cleans up the partial data from the failed previous run
  const result = await Category.deleteMany({ parentCategory: { $ne: null } });
  console.log(`🗑  Removed ${result.deletedCount} partial/existing subcategories`);

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
