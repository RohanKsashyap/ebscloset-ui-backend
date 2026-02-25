const imagekit = require('./imagekit');

/**
 * Upload an image to ImageKit
 * @param {Object} file - The file object from express-fileupload
 * @param {string} folder - The folder path (without leading slash)
 * @param {string} prefix - Filename prefix (optional)
 * @returns {Promise<Object>} - Upload response with url, fileId, thumbnailUrl
 */
async function uploadImage(file, folder = 'arlenco/products', prefix = '') {
  try {
    if (!file || !file.tempFilePath) {
      throw new Error('No valid file provided');
    }

    // Clean and prepare filename - be more aggressive with cleaning
    const cleanName = file.name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase();
    
    const timestamp = Date.now();
    const fileName = prefix ? `${prefix}_${timestamp}_${cleanName}` : `${timestamp}_${cleanName}`;

    console.log('Uploading image:', {
      fileName,
      folder,
      fileSize: file.size,
      mimetype: file.mimetype,
      tempFilePath: file.tempFilePath
    });

    // Verify file exists and is readable
    const fs = require('fs');
    if (!fs.existsSync(file.tempFilePath)) {
      throw new Error(`Temp file does not exist: ${file.tempFilePath}`);
    }

    const fileStats = fs.statSync(file.tempFilePath);
    if (fileStats.size === 0) {
      throw new Error('File is empty');
    }

    console.log('File verified:', {
      exists: true,
      size: fileStats.size,
      isFile: fileStats.isFile()
    });

    // Read file as buffer for ImageKit upload
    const fileBuffer = fs.readFileSync(file.tempFilePath);
    console.log('File buffer size:', fileBuffer.length);
    
    // Upload to ImageKit with file buffer
    const uploadResponse = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder,
      useUniqueFileName: false,
      tags: ['arlenco', folder.split('/').pop()],
      responseFields: ['fileId', 'url', 'thumbnailUrl', 'name', 'size', 'height', 'width'],
      overwriteFile: false
    });
    
    // Extract the path from the URL for IKImage component
    const urlObj = new URL(uploadResponse.url);
    const fullPath = urlObj.pathname; // Full pathname includes account name
    
    // Remove the account name from the path for IKImage component
    // The URL structure is: https://ik.imagekit.io/accountName/folder/file
    // We need to remove the first part (accountName) to get the relative path
    const pathParts = fullPath.split('/').filter(part => part !== '');
    const relativePath = '/' + pathParts.slice(1).join('/'); // Remove first part (account name)

    console.log('Upload successful:', {
      fileId: uploadResponse.fileId,
      url: uploadResponse.url,
      fullPath: fullPath,
      relativePath: relativePath,
      thumbnailUrl: uploadResponse.thumbnailUrl,
      size: uploadResponse.size,
      height: uploadResponse.height,
      width: uploadResponse.width
    });

    // Verify the upload was successful by checking the response
    if (!uploadResponse.fileId || !uploadResponse.url) {
      throw new Error('Upload response missing required fields');
    }

    return {
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      path: relativePath, // Use the relative path for IKImage component
      thumbnailUrl: uploadResponse.thumbnailUrl,
      name: uploadResponse.name,
      size: uploadResponse.size,
      height: uploadResponse.height,
      width: uploadResponse.width
    };

  } catch (error) {
    console.error('ImageKit upload error:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to upload image: ${error.message}`);
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
function generateImageUrl(fileName, folder = 'arlenco/products') {
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
  deleteImage,
  generateImageUrl
};
