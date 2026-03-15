require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function checkExistingProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find all products
    const products = await Product.find({});
    console.log(`\nFound ${products.length} products:`);
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Image URL: ${product.image}`);
      console.log(`   Image ID: ${product.imageId || 'None'}`);
      console.log(`   Thumbnail URL: ${product.thumbnailUrl || 'None'}`);
      console.log(`   Created: ${product.createdAt}`);
    });
    
    // Test a few image URLs
    console.log('\n=== Testing Image URLs ===');
    const fetch = require('node-fetch');
    
    for (let i = 0; i < Math.min(3, products.length); i++) {
      const product = products[i];
      if (product.image) {
        try {
          console.log(`\nTesting: ${product.image}`);
          const response = await fetch(product.image);
          console.log(`Status: ${response.status}, OK: ${response.ok}`);
          if (!response.ok) {
            console.log(`Error: ${response.statusText}`);
          }
        } catch (error) {
          console.log(`Error fetching image: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkExistingProducts();
