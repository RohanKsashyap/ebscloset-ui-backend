require('dotenv').config();
const fetch = require('node-fetch');

async function testUrls() {
  console.log('=== Testing Image URL Access ===\n');
  
  const urls = [
    // Direct ImageKit URLs
    'https://ik.imagekit.io/rohanKashyap/arlenco/products/product_1755509269947_yeast_for_animals.jpg',
    'https://ik.imagekit.io/rohanKashyap/arlenco/products/product_1755509269947_yeast_for_animals.jpg?updatedAt=1755509273326',
    
    // With transformations
    'https://ik.imagekit.io/rohanKashyap/tr:h-300,w-300,cm-extract,q-80/arlenco/products/product_1755509269947_yeast_for_animals.jpg',
    
    // Manual upload
    'https://ik.imagekit.io/rohanKashyap/arlenco/products/YEAST%20FOR%20ANIMALS.jpg?updatedAt=1755509537656'
  ];
  
  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url);
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Length: ${response.headers.get('content-length')}`);
      console.log('---');
    } catch (error) {
      console.log(`Error: ${error.message}`);
      console.log('---');
    }
  }
}

testUrls();