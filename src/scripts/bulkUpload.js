const fs = require('fs');
const path = require('path');
const imagekit = require('../utils/imagekit');

// Directory containing images to upload
const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error('Please provide a source directory path as an argument');
  console.error('Example: node bulkUpload.js "D:\\path\\to\\images"');
  process.exit(1);
}

// Check if directory exists
if (!fs.existsSync(sourceDir)) {
  console.error(`Directory not found: ${sourceDir}`);
  process.exit(1);
}

// Supported image file extensions
const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// Function to get all image files from a directory
function getImageFiles(dir) {
  const files = fs.readdirSync(dir);
  
  return files.filter(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    
    return stat.isFile() && supportedExtensions.includes(ext);
  });
}

// Function to upload a single file to ImageKit
async function uploadFile(filePath, fileName) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const uploadResponse = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: '/arlenco/bulk-upload'
    });
    
    return uploadResponse;
  } catch (error) {
    console.error(`Error uploading ${fileName}:`, error.message);
    return null;
  }
}

// Main function to process all images
async function processImages() {
  console.log(`Scanning directory: ${sourceDir}`);
  
  const imageFiles = getImageFiles(sourceDir);
  console.log(`Found ${imageFiles.length} image files to upload`);
  
  if (imageFiles.length === 0) {
    console.log('No images found in the specified directory.');
    return;
  }
  
  console.log('Starting upload process...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    const filePath = path.join(sourceDir, file);
    const fileName = `bulk_${Date.now()}_${file.replace(/\s+/g, '_')}`;
    
    console.log(`[${i+1}/${imageFiles.length}] Uploading: ${file}`);
    
    const result = await uploadFile(filePath, fileName);
    
    if (result) {
      console.log(`✓ Uploaded successfully: ${file} -> ${result.url}`);
      successCount++;
    } else {
      console.log(`✗ Failed to upload: ${file}`);
      failCount++;
    }
  }
  
  console.log('\nUpload process completed!');
  console.log(`Successfully uploaded: ${successCount} files`);
  console.log(`Failed to upload: ${failCount} files`);
}

// Run the process
processImages()
  .then(() => {
    console.log('Process completed.');
  })
  .catch(error => {
    console.error('An error occurred during the process:', error);
  });