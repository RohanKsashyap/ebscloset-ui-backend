require('dotenv').config();
const imagekit = require('./src/utils/imagekit');
const { uploadImage } = require('./src/utils/imageUpload');

async function debugImageKit() {
  console.log('=== ImageKit Debug ===');
  console.log('Configuration:');
  console.log('URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT);
  console.log('Public Key:', process.env.IMAGEKIT_PUBLIC_KEY ? 'Set' : 'Not set');
  console.log('Private Key:', process.env.IMAGEKIT_PRIVATE_KEY ? 'Set' : 'Not set');
  
  // Test 1: Check if we can authenticate with ImageKit
  try {
    console.log('\n=== Testing ImageKit Authentication ===');
    const authenticationParams = imagekit.getAuthenticationParameters();
    console.log('Authentication successful:', authenticationParams);
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return;
  }
  
  // Test 2: Try to list files to see if the folder structure exists
  try {
    console.log('\n=== Testing File Listing ===');
    const files = await imagekit.listFiles({
      path: 'arlenco/products/'
    });
    console.log('Files in arlenco/products:', files);
  } catch (error) {
    console.error('File listing failed:', error.message);
  }
  
  // Test 3: Check the specific file that's not working
  try {
    console.log('\n=== Testing Specific File ===');
    const fileDetails = await imagekit.getFileDetails('arlenco/products/product_1755422634159_worldisyours.jpg');
    console.log('File details:', fileDetails);
  } catch (error) {
    console.error('File details failed:', error.message);
  }
  
  // Test 4: Try a simple upload test
  try {
    console.log('\n=== Testing Upload ===');
    // Create a simple test buffer (1x1 pixel black PNG)
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    // Mock file object for testing
    const mockFile = {
      tempFilePath: null,
      name: 'test.png',
      size: testBuffer.length,
      mimetype: 'image/png',
      data: testBuffer
    };
    
    // We'll need to save the buffer to a temp file first
    const fs = require('fs');
    const path = require('path');
    const tempFilePath = path.join(__dirname, 'temp_test.png');
    
    fs.writeFileSync(tempFilePath, testBuffer);
    mockFile.tempFilePath = tempFilePath;
    
    console.log('Created temp file for testing:', tempFilePath);
    
    const result = await uploadImage(mockFile, 'arlenco/products', 'debug');
    console.log('Upload test result:', result);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    console.log('Cleaned up temp file');
    
    // Test accessing the uploaded file
    const fetch = require('node-fetch');
    const response = await fetch(result.url);
    console.log('Uploaded file accessible:', response.ok, 'Status:', response.status);
    
  } catch (error) {
    console.error('Upload test failed:', error.message);
    console.error('Full error:', error);
  }
}

debugImageKit().catch(console.error);
