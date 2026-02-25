/**
 * Script to fix image paths in the database
 * 
 * This script updates all images in the database to use the correct path format
 * for the imageId field, ensuring compatibility with the IKImage component.
 * 
 * Run with: node src/scripts/fix-image-paths.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GalleryImage = require('../models/GalleryImage');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const imagekit = require('../utils/imagekit');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function fixImagePaths() {
  try {
    console.log('Starting image path fix...');
    
    // Fix Gallery Images
    await fixCollectionImagePaths(GalleryImage, 'Gallery');
    
    // Fix Products
    await fixCollectionImagePaths(Product, 'Product');
    
    // Fix Offers
    await fixCollectionImagePaths(Offer, 'Offer');
    
    console.log('Image path fix completed!');
    
  } catch (err) {
    console.error('Fix failed:', err);
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

async function fixCollectionImagePaths(Model, modelName) {
  // Get all documents
  const documents = await Model.find();
  console.log(`Found ${documents.length} ${modelName} documents to check`);
  
  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  for (const doc of documents) {
    try {
      // Skip if no imageId or imageUrl
      if (!doc.imageId || !doc.imageUrl) {
        skippedCount++;
        continue;
      }
      
      // Check if the imageId is already correct (starts with /)
      // and matches the URL pattern
      const urlObj = new URL(doc.imageUrl);
      const correctPath = urlObj.pathname;
      
      // If the path is already correct, skip
      if (doc.imageId === correctPath) {
        skippedCount++;
        continue;
      }
      
      // Update the document with the correct path
      const updateResult = await Model.findByIdAndUpdate(
        doc._id, 
        { imageId: correctPath },
        { new: true }
      );
      
      console.log(`Updated ${modelName} ${doc._id}: ${doc.imageId} -> ${correctPath}`);
      updatedCount++;
      
    } catch (err) {
      console.error(`Error processing ${modelName} ${doc._id}:`, err);
      errorCount++;
    }
  }
  
  console.log(`${modelName} fix completed:`);
  console.log(`- ${updatedCount} documents updated successfully`);
  console.log(`- ${errorCount} documents had errors`);
  console.log(`- ${skippedCount} documents skipped (no image or already correct)`);
}

// Run the fix
fixImagePaths();