require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function fixImagePaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all products with imageId that contains the account name
    const products = await Product.find({
      imageId: { $regex: '^/rohanKashyap/' }
    });

    console.log(`Found ${products.length} products with incorrect image paths`);

    for (const product of products) {
      const oldPath = product.imageId;
      
      // Remove the account name from the path
      // Convert "/rohanKashyap/arlenco/products/..." to "/arlenco/products/..."
      const pathParts = oldPath.split('/').filter(part => part !== '');
      const newPath = '/' + pathParts.slice(1).join('/');
      
      console.log(`Fixing product ${product.name}:`);
      console.log(`  Old path: ${oldPath}`);
      console.log(`  New path: ${newPath}`);
      
      // Update the product
      await Product.findByIdAndUpdate(product._id, {
        imageId: newPath
      });
      
      console.log(`  ✓ Updated`);
    }

    console.log('\n✅ All image paths have been fixed!');
    
    // Verify the fix by checking a few products
    const sampleProducts = await Product.find({ imageId: { $ne: '' } }).limit(3);
    console.log('\nSample products after fix:');
    sampleProducts.forEach(product => {
      console.log(`- ${product.name}: ${product.imageId}`);
    });

  } catch (error) {
    console.error('Error fixing image paths:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixImagePaths();