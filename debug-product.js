require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function debugProduct() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const product = await Product.findOne({ name: /Sparkle Princess Dress/i });
    if (!product) {
      console.log('Product not found!');
    } else {
      console.log('Full Product Document:');
      console.log(JSON.stringify(product, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugProduct();
