/**
 * Script to test ImageKit path handling
 * 
 * This script tests how ImageKit handles paths and URLs to ensure
 * the IKImage component can correctly display images.
 */

require('dotenv').config();
const imagekit = require('../utils/imagekit');

async function testImageKitPaths() {
  console.log('=== ImageKit Path Testing ===');
  console.log('URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT);
  
  try {
    // Test 1: List some files to work with
    console.log('\n=== Listing Recent Files ===');
    const files = await imagekit.listFiles({
      limit: 5,
      skip: 0,
      sort: 'DESC_CREATED'
    });
    
    if (files.length === 0) {
      console.log('No files found in ImageKit');
      return;
    }
    
    // Test with the first file
    const testFile = files[0];
    console.log('\n=== Test File ===');
    console.log('File ID:', testFile.fileId);
    console.log('File Name:', testFile.name);
    console.log('File URL:', testFile.url);
    
    // Parse the URL to extract the path
    const urlObj = new URL(testFile.url);
    const fullPath = urlObj.pathname;
    const pathWithoutAccount = fullPath.replace('/rohanKashyap', '');
    
    console.log('\n=== Path Analysis ===');
    console.log('Full Path:', fullPath);
    console.log('Path without account name:', pathWithoutAccount);
    
    // Test how IKImage would use these paths
    console.log('\n=== IKImage Usage ===');
    console.log('IKImage with full path would be:');
    console.log(`<IKImage urlEndpoint="${process.env.IMAGEKIT_URL_ENDPOINT}" path="${fullPath}" />`);
    console.log('\nIKImage with path without account would be:');
    console.log(`<IKImage urlEndpoint="${process.env.IMAGEKIT_URL_ENDPOINT}" path="${pathWithoutAccount}" />`);
    
    // Construct the expected URLs
    const expectedUrlWithFullPath = `${process.env.IMAGEKIT_URL_ENDPOINT}${fullPath}`;
    const expectedUrlWithPathWithoutAccount = `${process.env.IMAGEKIT_URL_ENDPOINT}${pathWithoutAccount}`;
    
    console.log('\n=== Expected URLs ===');
    console.log('With full path:', expectedUrlWithFullPath);
    console.log('With path without account:', expectedUrlWithPathWithoutAccount);
    console.log('Original URL:', testFile.url);
    
    // Compare with original URL
    console.log('\n=== URL Comparison ===');
    console.log('Full path matches original URL:', expectedUrlWithFullPath === testFile.url);
    console.log('Path without account matches original URL:', expectedUrlWithPathWithoutAccount === testFile.url);
    
    // Recommendation
    console.log('\n=== Recommendation ===');
    if (expectedUrlWithFullPath === testFile.url) {
      console.log('Use the FULL PATH (including account name) for the path parameter in IKImage');
    } else if (expectedUrlWithPathWithoutAccount === testFile.url) {
      console.log('Use the PATH WITHOUT ACCOUNT NAME for the path parameter in IKImage');
    } else {
      console.log('Neither path format matches the original URL. Further investigation needed.');
    }
    
  } catch (error) {
    console.error('Error testing ImageKit paths:', error);
  }
}

testImageKitPaths().catch(console.error);