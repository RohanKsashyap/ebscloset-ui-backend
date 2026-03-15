/**
 * Migration script to update existing gallery images to use path instead of fileId
 * 
 * This script updates all existing gallery images in the database to use
 * the path format instead of fileId for the imageId field.
 * 
 * Run with: node src/scripts/migrate-gallery-images.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GalleryImage = require('../models/GalleryImage');
const imagekit = require('../utils/imagekit');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function migrateGalleryImages() {
  try {
    console.log('Starting gallery image migration...');
    
    // Get all gallery images
    const images = await GalleryImage.find();
    console.log(`Found ${images.length} gallery images to migrate`);
    
    // Get all files from ImageKit
    const files = await imagekit.listFiles({
      path: '/arlenco/gallery',
      limit: 1000
    });
    console.log(`Found ${files.length} files in ImageKit`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each image
    for (const image of images) {
      try {
        // Skip if already using path format (starts with /)
        if (image.imageId && image.imageId.startsWith('/')) {
          console.log(`Image ${image._id} already using path format: ${image.imageId}`);
          continue;
        }
        
        // Find matching file in ImageKit by fileId
        const matchingFile = files.find(file => file.fileId === image.imageId);
        
        if (matchingFile) {
          // Extract path from URL
          const urlObj = new URL(matchingFile.url);
          const path = urlObj.pathname.replace('/rohanKashyap', '');
          
          // Update image with path
          await GalleryImage.findByIdAndUpdate(image._id, { imageId: path });
          
          console.log(`Updated image ${image._id}: ${image.imageId} -> ${path}`);
          updatedCount++;
        } else {
          console.error(`Could not find matching file for image ${image._id} with fileId ${image.imageId}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`Error processing image ${image._id}:`, err);
        errorCount++;
      }
    }
    
    console.log('Migration completed:');
    console.log(`- ${updatedCount} images updated successfully`);
    console.log(`- ${errorCount} images had errors`);
    console.log(`- ${images.length - updatedCount - errorCount} images skipped (already using path format)`);
    
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    // Disconnect from MongoDB
    mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// Run migration
migrateGalleryImages();