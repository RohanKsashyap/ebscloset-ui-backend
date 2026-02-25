const ImageKit = require('imagekit');
const dotenv = require('dotenv');

dotenv.config();

// Initialize ImageKit with credentials from environment variables
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Add debug logging for ImageKit initialization
console.log('ImageKit initialized with URL endpoint:', process.env.IMAGEKIT_URL_ENDPOINT);

module.exports = imagekit;