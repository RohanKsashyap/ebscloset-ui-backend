require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function testImageUrls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find products with imageId
    const products = await Product.find({ imageId: { $ne: '' } });
    
    console.log(`\nFound ${products.length} products with images:`);
    
    products.forEach(product => {
      console.log(`\n📦 Product: ${product.name}`);
      console.log(`   Image URL: ${product.image}`);
      console.log(`   Image ID (path): ${product.imageId}`);
      
      // Generate what the IKImage URL should be
      const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
      const expectedUrl = `${urlEndpoint}${product.imageId}`;
      console.log(`   Expected IKImage URL: ${expectedUrl}`);
      
      // Test with transformation
      const transformedUrl = `${urlEndpoint}/tr:h-300,w-300,cm-extract,q-80${product.imageId}`;
      console.log(`   With transformation: ${transformedUrl}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testImageUrls();