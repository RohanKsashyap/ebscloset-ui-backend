const imagekit = require('./imagekit');

/**
 * Upload an image to ImageKit with retry logic and transformations
 * @param {Object} file - The file object from express-fileupload
 * @param {string} folder - The folder path (without leading slash)
 * @param {string} prefix - Filename prefix (optional)
 * @returns {Promise<Object>} - Upload response with url, fileId, thumbnailUrl
 */
async function uploadImage(file, folder = 'ebs-closet/products', prefix = '') {
  const MAX_RETRIES = 2;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      if (!file || !file.tempFilePath) {
        throw new Error('No valid file provided');
      }

      // Clean and prepare filename
      const cleanName = file.name
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();
      
      const timestamp = Date.now();
      const fileName = prefix ? `${prefix}_${timestamp}_${cleanName}` : `${timestamp}_${cleanName}`;

      const fs = require('fs');
      if (!fs.existsSync(file.tempFilePath)) {
        throw new Error(`Temp file does not exist: ${file.tempFilePath}`);
      }

      const fileStats = fs.statSync(file.tempFilePath);
      if (fileStats.size === 0) {
        throw new Error('File is empty');
      }

      const fileBuffer = fs.readFileSync(file.tempFilePath);
      
      console.log(`Uploading image (attempt ${attempt + 1}):`, { fileName, size: fileStats.size });

      // Use safer transformations for high-res images
      const uploadOptions = {
        file: fileBuffer,
        fileName: fileName,
        folder: folder,
        useUniqueFileName: false,
        tags: ['ebs-closet', folder.split('/').pop()],
        responseFields: ['fileId', 'url', 'thumbnailUrl', 'name', 'size', 'height', 'width'],
        overwriteFile: false
      };

      // Only add transformations if it's not the last fallback attempt
      if (attempt < MAX_RETRIES) {
        uploadOptions.transformation = {
          pre: 'l-image,i-ebs-closet@@logo.png,w-100,ox-10,oy-10,ot-10,ofo-bottom_right,q-80/f-auto/q-auto' // Example watermark and optimization
        };
        // If the previous attempt failed specifically with transformation error, try a simpler one
        if (attempt === 1) {
          uploadOptions.transformation = {
            pre: 'f-auto,q-auto'
          };
        }
      }

      const uploadResponse = await imagekit.upload(uploadOptions);
      
      // Extract the path from the URL for IKImage component
      const urlObj = new URL(uploadResponse.url);
      const fullPath = urlObj.pathname;
      const pathParts = fullPath.split('/').filter(part => part !== '');
      const relativePath = '/' + pathParts.slice(1).join('/');

      return {
        url: uploadResponse.url,
        fileId: uploadResponse.fileId,
        path: relativePath,
        thumbnailUrl: uploadResponse.thumbnailUrl,
        name: uploadResponse.name,
        size: uploadResponse.size,
        height: uploadResponse.height,
        width: uploadResponse.width
      };

    } catch (error) {
      console.error(`ImageKit upload attempt ${attempt + 1} failed:`, error.message);
      attempt++;
      if (attempt > MAX_RETRIES) {
        throw new Error(`Failed to upload image after ${MAX_RETRIES + 1} attempts: ${error.message}`);
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Upload an image to ImageKit from a URL
 * @param {string} url - The image URL
 * @param {string} folder - The folder path
 * @param {string} prefix - Filename prefix
 * @returns {Promise<Object>} - Upload response
 */
async function uploadImageFromUrl(url, folder = 'ebs-closet/site', prefix = 'asset') {
  try {
    if (!url) {
      throw new Error('No URL provided');
    }

    const timestamp = Date.now();
    const fileName = `${prefix}_${timestamp}`;

    console.log('Uploading image from URL:', { url, folder, fileName });

    const uploadResponse = await imagekit.upload({
      file: url,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: true,
      tags: ['ebs-closet', folder.split('/').pop(), 'from-url'],
      responseFields: ['fileId', 'url', 'thumbnailUrl', 'name', 'size', 'height', 'width']
    });

    const urlObj = new URL(uploadResponse.url);
    const fullPath = urlObj.pathname;
    const pathParts = fullPath.split('/').filter(part => part !== '');
    const relativePath = '/' + pathParts.slice(1).join('/');

    return {
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      path: relativePath,
      thumbnailUrl: uploadResponse.thumbnailUrl,
      name: uploadResponse.name,
      size: uploadResponse.size,
      height: uploadResponse.height,
      width: uploadResponse.width
    };
  } catch (error) {
    console.error('ImageKit URL upload error:', error);
    throw new Error(`Failed to upload image from URL: ${error.message}`);
  }
}

/**
 * Delete an image from ImageKit
 * @param {string} fileId - The ImageKit file ID
 * @returns {Promise<boolean>} - True if deletion was successful
 */
async function deleteImage(fileId) {
  try {
    if (!fileId) {
      console.log('No fileId provided for deletion');
      return false;
    }

    console.log('Deleting image:', fileId);
    await imagekit.deleteFile(fileId);
    console.log('Image deleted successfully');
    return true;

  } catch (error) {
    console.error('ImageKit deletion error:', error);
    // Don't throw error for deletion failures, just log and continue
    return false;
  }
}

/**
 * Generate ImageKit URL for testing
 * @param {string} fileName - The filename
 * @param {string} folder - The folder path
 * @returns {string} - The expected URL
 */
function generateImageUrl(fileName, folder = 'ebs-closet/products') {
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!urlEndpoint) {
    throw new Error('IMAGEKIT_URL_ENDPOINT not configured');
  }
  
  // Remove leading slash from folder if present
  const cleanFolder = folder.startsWith('/') ? folder.substring(1) : folder;
  return `${urlEndpoint}/${cleanFolder}/${fileName}`;
}

module.exports = {
  uploadImage,
  uploadImageFromUrl,
  deleteImage,
  generateImageUrl
};
