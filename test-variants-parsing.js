// Test script to verify variants parsing fix
const express = require('express');
const fileUpload = require('express-fileupload');

const app = express();

// Middleware for file uploads
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route for variants parsing
app.post('/test-variants', (req, res) => {
  console.log('Request body:', req.body);
  
  // Parse variants if provided
  let variants = [];
  if (req.body.variants && req.body.variants.trim() !== '') {
    try {
      variants = JSON.parse(req.body.variants);
      console.log('Successfully parsed variants:', variants);
    } catch (e) {
      console.error('Error parsing variants:', e);
    }
  } else {
    console.log('No variants provided or empty string');
  }
  
  res.json({ success: true, variants });
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test the fix by sending a POST request to http://localhost:${PORT}/test-variants`);
});