const { Router } = require('express');
const os = require('os');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Sale = require('../models/Sale');
const InventoryLog = require('../models/InventoryLog');
const Contact = require('../models/Contact');
const SiteSetting = require('../models/SiteSetting');
const Navigation = require('../models/Navigation');
const DiscountCode = require('../models/DiscountCode');
const Subscriber = require('../models/Subscriber');
const adminAuth = require('../middleware/adminAuth');
const { uploadImage, deleteImage } = require('../utils/imageUpload');
const { incrementStock, decrementStock } = require('../utils/inventory');

const router = Router();
router.use(adminAuth);

// Helper to sanitize potential array/object inputs from multipart forms
const sanitizeString = (val) => {
  if (Array.isArray(val)) {
    return val.find(v => typeof v === 'string' && v !== '') || '';
  }
  if (typeof val !== 'string') return '';
  return val;
};

 // Helper to get first file if it's an array
 const getFirstFile = (file) => {
  if (Array.isArray(file)) return file[0];
  return file;
};


// Product CRUD
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).populate('categoryId', 'name slug');
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// In the POST /products route
router.post('/products', async (req, res) => {
  try {
    const name = sanitizeString(req.body.name);
    const price = req.body.price;
    const originalPrice = req.body.originalPrice;
    const description = sanitizeString(req.body.description);
    const categoryId = sanitizeString(req.body.categoryId);
    const inStock = req.body.inStock;
    const size = sanitizeString(req.body.size);
    const sizes = req.body.sizes || [];
    const color = sanitizeString(req.body.color);
    const minStock = req.body.minStock;
    const trending = req.body.trending;
    const bestseller = req.body.bestseller;
    const newarrival = req.body.newarrival;
    const assured = req.body.assured;
    
    let imageUrl = '';
    let imageId = '';
    let thumbnailUrl = '';

    // Hover image fields
    let hoverImageUrl = '';
    let hoverImageId = '';

    // Image 3 fields
    let image3Url = '';
    let image3Id = '';

    // Image 4 fields
    let image4Url = '';
    let image4Id = '';

    // Video fields
    let videoUrl = '';
    let videoId = '';
    let video2Url = '';
    let video2Id = '';
    let video3Url = '';
    let video3Id = '';
    
   

    // Handle image upload if file is provided
    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      console.log('Processing file upload for product creation:', imageFile.name);
      try {
        const uploadResponse = await uploadImage(imageFile, 'ebs-closet/products', 'product');
        imageUrl = uploadResponse.url;
        imageId = uploadResponse.fileId; // Use fileId for deletion
        thumbnailUrl = uploadResponse.thumbnailUrl;
        console.log('File upload successful:', { url: imageUrl, fileId: imageId });
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    } else {
      const bodyImage = sanitizeString(req.body.image);
      if (bodyImage) {
        imageUrl = bodyImage;
        console.log('Using provided image URL:', imageUrl);
      }
    }

    // Handle hover image upload (optional)
    const hoverImageFile = getFirstFile(req.files?.hoverImage);
    if (hoverImageFile) {
      try {
        const hoverUpload = await uploadImage(hoverImageFile, 'ebs-closet/products', 'product-hover');
        hoverImageUrl = hoverUpload.url;
        hoverImageId = hoverUpload.fileId;
      } catch (uploadError) {
        console.error('Hover image upload failed:', uploadError);
        // not fatal
      }
    } else {
      hoverImageUrl = sanitizeString(req.body.hoverImage);
    }

    // Handle image 3 upload (optional)
    const image3File = getFirstFile(req.files?.image3);
    if (image3File) {
      try {
        const upload3 = await uploadImage(image3File, 'ebs-closet/products', 'product-3');
        image3Url = upload3.url;
        image3Id = upload3.fileId;
      } catch (uploadError) {
        console.error('Image 3 upload failed:', uploadError);
      }
    } else {
      image3Url = sanitizeString(req.body.image3);
    }

    // Handle image 4 upload (optional)
    const image4File = getFirstFile(req.files?.image4);
    if (image4File) {
      try {
        const upload4 = await uploadImage(image4File, 'ebs-closet/products', 'product-4');
        image4Url = upload4.url;
        image4Id = upload4.fileId;
      } catch (uploadError) {
        console.error('Image 4 upload failed:', uploadError);
      }
    } else {
      image4Url = sanitizeString(req.body.image4);
    }

    // Handle video upload (optional)
    const videoFile = getFirstFile(req.files?.video);
    if (videoFile) {
      try {
        const videoUpload = await uploadImage(videoFile, 'ebs-closet/products', 'product-video');
        videoUrl = videoUpload.url;
        videoId = videoUpload.fileId;
      } catch (uploadError) {
        console.error('Video upload failed:', uploadError);
      }
    } else {
      videoUrl = sanitizeString(req.body.video);
    }

    // Handle video 2 upload (optional)
    const video2File = getFirstFile(req.files?.video2);
    if (video2File) {
      try {
        const video2Upload = await uploadImage(video2File, 'ebs-closet/products', 'product-video-2');
        video2Url = video2Upload.url;
        video2Id = video2Upload.fileId;
      } catch (uploadError) {
        console.error('Video 2 upload failed:', uploadError);
      }
    } else {
      video2Url = sanitizeString(req.body.video2);
    }

    // Handle video 3 upload (optional)
    const video3File = getFirstFile(req.files?.video3);
    if (video3File) {
      try {
        const video3Upload = await uploadImage(video3File, 'ebs-closet/products', 'product-video-3');
        video3Url = video3Upload.url;
        video3Id = video3Upload.fileId;
      } catch (uploadError) {
        console.error('Video 3 upload failed:', uploadError);
      }
    } else {
      video3Url = sanitizeString(req.body.video3);
    }
    
    // Parse variants if provided
    let variants = [];
    if (req.body.variants && req.body.variants.trim() !== '') {
      try {
        variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    }
    
    const product = await Product.create({
      name,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description,
      category: req.body.category || undefined, // legacy support if client still sends name
      categoryId: categoryId || null,
      image: imageUrl,
      imageId,
      thumbnailUrl,
      hoverImage: hoverImageUrl,
      hoverImageId,
      image3: image3Url,
      image3Id,
      image4: image4Url,
      image4Id,
      video: videoUrl,
      videoId,
      video2: video2Url,
      video2Id,
      video3: video3Url,
      video3Id,
      inStock: Number(inStock),
      size: size || '',
      sizes: Array.isArray(sizes) ? sizes : [sizes],
      color: color || '',
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      trending: trending === 'true' || trending === true,
      bestseller: bestseller === 'true' || bestseller === true,
      newarrival: newarrival === 'true' || newarrival === true,
      assured: assured === 'true' || assured === true,
      variants
    });
    
    res.json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Error creating product', error: err.message });
  }
});

// Bulk update products
router.put('/products/bulk', async (req, res) => {
  try {
    const { ids, update } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }
    
    // Whitelist allowed update fields for safety
    const allowedFields = ['trending', 'bestseller', 'newarrival', 'category', 'categoryId', 'inStock', 'size', 'sizes', 'color', 'assured'];
    const updateData = {};
    
    Object.keys(update).forEach(key => {
      if (allowedFields.includes(key)) {
        if (['category', 'size', 'color'].includes(key)) {
          updateData[key] = sanitizeString(update[key]);
        } else if (key === 'sizes') {
          updateData[key] = Array.isArray(update[key]) ? update[key] : [update[key]];
        } else {
          updateData[key] = update[key];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided' });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (err) {
    console.error('Error bulk updating products:', err);
    res.status(500).json({ message: 'Error bulk updating products' });
  }
});

// Bulk delete products
router.delete('/products/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No product IDs provided' });
    }

    // Get all products to delete their images first
    const products = await Product.find({ _id: { $in: ids } });
    
    for (const product of products) {
      // Delete images from ImageKit
      const imageIdsToDelete = [
        product.imageId,
        product.hoverImageId,
        product.image3Id,
        product.image4Id,
        product.videoId,
        product.video2Id,
        product.video3Id
      ].filter(id => id && id !== '');

      for (const id of imageIdsToDelete) {
        try {
          await deleteImage(id);
        } catch (err) {
          console.error(`Failed to delete image ${id} for product ${product._id}:`, err);
        }
      }
    }

    const result = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error bulk deleting products:', err);
    res.status(500).json({ message: 'Error bulk deleting products' });
  }
});

// In the PUT /products/:id route
router.put('/products/:id', async (req, res) => {
  try {
    console.log('Update request for product:', req.params.id);
    console.log('req.body keys:', Object.keys(req.body));
    if (req.files) console.log('req.files keys:', Object.keys(req.files));

    const name = sanitizeString(req.body.name);
    const price = req.body.price;
    const originalPrice = req.body.originalPrice;
    const description = sanitizeString(req.body.description);
    const categoryId = sanitizeString(req.body.categoryId);
    const inStock = req.body.inStock;
    const size = sanitizeString(req.body.size);
    const sizes = req.body.sizes || [];
    const color = sanitizeString(req.body.color);
    const minStock = req.body.minStock;
    const trending = req.body.trending;
    const bestseller = req.body.bestseller;
    const newarrival = req.body.newarrival;
    const assured = req.body.assured;
    
    const updateData = {
      name,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description,
      categoryId: categoryId || null,
      inStock: Number(inStock),
      size: size || '',
      sizes: Array.isArray(sizes) ? sizes : [sizes],
      color: color || '',
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      trending: trending === 'true' || trending === true,
      bestseller: bestseller === 'true' || bestseller === true,
      newarrival: newarrival === 'true' || newarrival === true,
      assured: assured === 'true' || assured === true
    };
    
    // Parse variants if provided
    if (req.body.variants && typeof req.body.variants === 'string' && req.body.variants.trim() !== '') {
      try {
        updateData.variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    } else if (Array.isArray(req.body.variants)) {
      updateData.variants = req.body.variants;
    }
    
    // Handle image upload if file is provided
    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      console.log('Processing file upload for product update:', imageFile.name);
      try {
        // Get existing product to delete old image
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.imageId) {
          console.log('Deleting old image:', existingProduct.imageId);
          await deleteImage(existingProduct.imageId);
        }
        
        // Upload new image
        const uploadResponse = await uploadImage(imageFile, 'ebs-closet/products', 'product');
        console.log('uploadImage response:', uploadResponse);
        
        // Add new image data to update
        updateData.image = uploadResponse.url;
        updateData.imageId = uploadResponse.fileId; // Use fileId for deletion
        updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
        console.log('File update successful:', { url: uploadResponse.url, fileId: uploadResponse.fileId });
      } catch (uploadError) {
        console.error('File upload failed during update:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    } else {
      const bodyImage = sanitizeString(req.body.image);
      console.log('No file upload, bodyImage sanitized:', bodyImage);
      if (bodyImage && bodyImage !== '') {
        // If image URL is provided directly and it's different from the current one
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.image !== bodyImage) {
          // If there's an existing ImageKit image, delete it
          if (existingProduct.imageId) {
            await deleteImage(existingProduct.imageId);
          }
          
          // Update with new image URL
          updateData.image = bodyImage;
          updateData.imageId = ''; // Clear ImageKit ID since this is an external URL
          updateData.thumbnailUrl = ''; // Clear thumbnail URL
        }
      }
    }

    // Optional hover image update
    const hoverImageFile = getFirstFile(req.files?.hoverImage);
    if (hoverImageFile) {
      try {
        // delete old hover image if exists
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.hoverImageId) {
          await deleteImage(existingProduct.hoverImageId);
        }
        const hoverUpload = await uploadImage(hoverImageFile, 'ebs-closet/products', 'product-hover');
        updateData.hoverImage = hoverUpload.url;
        updateData.hoverImageId = hoverUpload.fileId;
      } catch (e) {
        console.error('Hover image upload failed during update:', e);
      }
    } else {
      const hoverImage = sanitizeString(req.body.hoverImage);
      if (req.body.hoverImage !== undefined) { // Only update if field was sent
        const existingProduct = await Product.findById(req.params.id);
        if (hoverImage === '') {
          // remove existing alternate image and clear ids
          if (existingProduct && existingProduct.hoverImageId) {
            try { await deleteImage(existingProduct.hoverImageId); } catch (e) { console.error('Failed to delete old hover image:', e); }
          }
          updateData.hoverImage = '';
          updateData.hoverImageId = '';
        } else if (hoverImage) {
          // set to provided URL; if switching away from IK, clear id and delete old IK file
          if (existingProduct && existingProduct.hoverImageId && existingProduct.hoverImage !== hoverImage) {
            try { await deleteImage(existingProduct.hoverImageId); } catch (e) { console.error('Failed to delete old hover image:', e); }
          }
          updateData.hoverImage = hoverImage;
          if (!hoverImage.includes('ik.imagekit.io')) {
            updateData.hoverImageId = '';
          }
        }
      }
    }

    // Optional image 3 update
    const image3File = getFirstFile(req.files?.image3);
    if (image3File) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.image3Id) {
          await deleteImage(existingProduct.image3Id);
        }
        const upload3 = await uploadImage(image3File, 'ebs-closet/products', 'product-3');
        updateData.image3 = upload3.url;
        updateData.image3Id = upload3.fileId;
      } catch (e) {
        console.error('Image 3 upload failed during update:', e);
      }
    } else {
      const image3 = sanitizeString(req.body.image3);
      if (req.body.image3 !== undefined) {
        const existingProduct = await Product.findById(req.params.id);
        if (image3 === '') {
          if (existingProduct && existingProduct.image3Id) {
            try { await deleteImage(existingProduct.image3Id); } catch (e) { console.error('Failed to delete old image3:', e); }
          }
          updateData.image3 = '';
          updateData.image3Id = '';
        } else if (image3) {
          if (existingProduct && existingProduct.image3Id && existingProduct.image3 !== image3) {
            try { await deleteImage(existingProduct.image3Id); } catch (e) { console.error('Failed to delete old image3:', e); }
          }
          updateData.image3 = image3;
          if (!image3.includes('ik.imagekit.io')) {
            updateData.image3Id = '';
          }
        }
      }
    }

    // Optional image 4 update
    const image4File = getFirstFile(req.files?.image4);
    if (image4File) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.image4Id) {
          await deleteImage(existingProduct.image4Id);
        }
        const upload4 = await uploadImage(image4File, 'ebs-closet/products', 'product-4');
        updateData.image4 = upload4.url;
        updateData.image4Id = upload4.fileId;
      } catch (e) {
        console.error('Image 4 upload failed during update:', e);
      }
    } else {
      const image4 = sanitizeString(req.body.image4);
      if (req.body.image4 !== undefined) {
        const existingProduct = await Product.findById(req.params.id);
        if (image4 === '') {
          if (existingProduct && existingProduct.image4Id) {
            try { await deleteImage(existingProduct.image4Id); } catch (e) { console.error('Failed to delete old image4:', e); }
          }
          updateData.image4 = '';
          updateData.image4Id = '';
        } else if (image4) {
          if (existingProduct && existingProduct.image4Id && existingProduct.image4 !== image4) {
            try { await deleteImage(existingProduct.image4Id); } catch (e) { console.error('Failed to delete old image4:', e); }
          }
          updateData.image4 = image4;
          if (!image4.includes('ik.imagekit.io')) {
            updateData.image4Id = '';
          }
        }
      }
    }

    // Optional video update
    const videoFile = getFirstFile(req.files?.video);
    if (videoFile) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.videoId) {
          await deleteImage(existingProduct.videoId);
        }
        const videoUpload = await uploadImage(videoFile, 'ebs-closet/products', 'product-video');
        updateData.video = videoUpload.url;
        updateData.videoId = videoUpload.fileId;
      } catch (e) {
        console.error('Video upload failed during update:', e);
      }
    } else {
      const video = sanitizeString(req.body.video);
      if (req.body.video !== undefined) {
        const existingProduct = await Product.findById(req.params.id);
        if (video === '') {
          if (existingProduct && existingProduct.videoId) {
            try { await deleteImage(existingProduct.videoId); } catch (e) { console.error('Failed to delete old video:', e); }
          }
          updateData.video = '';
          updateData.videoId = '';
        } else if (video) {
          if (existingProduct && existingProduct.videoId && existingProduct.video !== video) {
            try { await deleteImage(existingProduct.videoId); } catch (e) { console.error('Failed to delete old video:', e); }
          }
          updateData.video = video;
          if (!video.includes('ik.imagekit.io')) {
            updateData.videoId = '';
          }
        }
      }
    }

    // Optional video 2 update
    const video2File = getFirstFile(req.files?.video2);
    if (video2File) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.video2Id) {
          await deleteImage(existingProduct.video2Id);
        }
        const video2Upload = await uploadImage(video2File, 'ebs-closet/products', 'product-video-2');
        updateData.video2 = video2Upload.url;
        updateData.video2Id = video2Upload.fileId;
      } catch (e) {
        console.error('Video 2 upload failed during update:', e);
      }
    } else {
      const video2 = sanitizeString(req.body.video2);
      if (req.body.video2 !== undefined) {
        const existingProduct = await Product.findById(req.params.id);
        if (video2 === '') {
          if (existingProduct && existingProduct.video2Id) {
            try { await deleteImage(existingProduct.video2Id); } catch (e) { console.error('Failed to delete old video 2:', e); }
          }
          updateData.video2 = '';
          updateData.video2Id = '';
        } else if (video2) {
          if (existingProduct && existingProduct.video2Id && existingProduct.video2 !== video2) {
            try { await deleteImage(existingProduct.video2Id); } catch (e) { console.error('Failed to delete old video 2:', e); }
          }
          updateData.video2 = video2;
          if (!video2.includes('ik.imagekit.io')) {
            updateData.video2Id = '';
          }
        }
      }
    }

    // Optional video 3 update
    const video3File = getFirstFile(req.files?.video3);
    if (video3File) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.video3Id) {
          await deleteImage(existingProduct.video3Id);
        }
        const video3Upload = await uploadImage(video3File, 'ebs-closet/products', 'product-video-3');
        updateData.video3 = video3Upload.url;
        updateData.video3Id = video3Upload.fileId;
      } catch (e) {
        console.error('Video 3 upload failed during update:', e);
      }
    } else {
      const video3 = sanitizeString(req.body.video3);
      if (req.body.video3 !== undefined) {
        const existingProduct = await Product.findById(req.params.id);
        if (video3 === '') {
          if (existingProduct && existingProduct.video3Id) {
            try { await deleteImage(existingProduct.video3Id); } catch (e) { console.error('Failed to delete old video 3:', e); }
          }
          updateData.video3 = '';
          updateData.video3Id = '';
        } else if (video3) {
          if (existingProduct && existingProduct.video3Id && existingProduct.video3 !== video3) {
            try { await deleteImage(existingProduct.video3Id); } catch (e) { console.error('Failed to delete old video 3:', e); }
          }
          updateData.video3 = video3;
          if (!video3.includes('ik.imagekit.io')) {
            updateData.video3Id = '';
          }
        }
      }
    }
    
    const existing = await Product.findById(req.params.id);
    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Inventory audit logs for changes
    try {
      if (existing) {
        // Product-level change
        if (typeof updateData.inStock === 'number' && updateData.inStock !== existing.inStock) {
          await InventoryLog.create({
            productId: existing._id,
            productName: existing.name,
            change: updateData.inStock - (existing.inStock || 0),
            previousStock: existing.inStock || 0,
            newStock: updateData.inStock,
            reason: 'product-edit',
          });
        }
        if (Array.isArray(updateData.variants)) {
          const mapExisting = new Map((existing.variants || []).map(v => [v.name, v]));
          updateData.variants.forEach(v => {
            const prev = mapExisting.get(v.name);
            if (prev && typeof v.inStock === 'number' && v.inStock !== prev.inStock) {
              InventoryLog.create({
                productId: existing._id,
                productName: existing.name,
                variantName: v.name,
                change: v.inStock - (prev.inStock || 0),
                previousStock: prev.inStock || 0,
                newStock: v.inStock,
                reason: 'product-edit',
              }).catch(() => {});
            }
          });
        }
      }
    } catch (e) {
      console.error('InventoryLog error (product edit):', e);
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete images from ImageKit if they exist
    if (product.imageId) await deleteImage(product.imageId);
    if (product.hoverImageId) await deleteImage(product.hoverImageId);
    if (product.image3Id) await deleteImage(product.image3Id);
    if (product.image4Id) await deleteImage(product.image4Id);
    if (product.videoId) await deleteImage(product.videoId);
    if (product.video2Id) await deleteImage(product.video2Id);
    if (product.video3Id) await deleteImage(product.video3Id);
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Error deleting product' });
  }
});

// Contacts management
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching contacts' });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const { status } = req.body; // expected: 'new' | 'read' | 'resolved'
    const allowed = ['new', 'read', 'resolved'];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Contact not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating contact' });
  }
});

router.delete('/contacts/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No contact IDs provided' });
    }
    const result = await Contact.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error bulk deleting contacts' });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting contact' });
  }
});

// Orders management
router.get('/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching order' });
  }
});

// In the PUT /orders/:id route
router.put('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const newStatus = String(status || '').toLowerCase();
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const oldStatus = String(order.status || '').toLowerCase();

    const approvedStatuses = ['processing', 'shipped', 'delivered'];
    const nonApprovedStatuses = ['pending', 'cancelled', 'returned'];

    // Decouple stock management from sales record creation
    const isBecomingApproved = approvedStatuses.includes(newStatus) && nonApprovedStatuses.includes(oldStatus);
    const isBecomingUnapproved = nonApprovedStatuses.includes(newStatus) && approvedStatuses.includes(oldStatus);

    // Handle stock decrement when order is approved
    if (isBecomingApproved) {
      try {
        await decrementStock(order.products || [], order._id);
      } catch (stockErr) {
        console.error(`Error decrementing stock for approved order ${order._id}:`, stockErr);
      }
    }

    // Handle stock increment when order is cancelled or returned after being approved
    if (isBecomingUnapproved) {
      const reason = newStatus === 'returned' ? 'order-returned' : 'order-cancelled';
      try {
        await incrementStock(order.products || [], order._id, reason);
      } catch (stockErr) {
        console.error(`Error incrementing stock for unapproved order ${order._id}:`, stockErr);
      }
    }

    // If status is changing to 'delivered', create a sale record
    if (newStatus === 'delivered' && oldStatus !== 'delivered') {
      // Check if a sale record already exists for this order to avoid duplicates
      const existingSale = await Sale.findOne({ orderId: order._id });
      if (!existingSale) {
        await Sale.create({
          orderId: order._id,
          products: order.products,
          customer: order.customer,
          paymentMethod: order.paymentMethod,
          totalAmount: order.totalAmount,
          saleDate: new Date()
        });
      }
    } 
    
    // Update the order status
    order.status = newStatus;
    
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ message: 'Error updating order' });
  }
});

// Bulk delete orders
router.delete('/orders/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No order IDs provided' });
    }

    // Handle stock increment for orders being deleted that were in approved status
    const approvedStatuses = ['processing', 'shipped', 'delivered'];
    const ordersToProcess = await Order.find({ _id: { $in: ids } });
    
    for (const order of ordersToProcess) {
      if (approvedStatuses.includes(String(order.status || '').toLowerCase())) {
        try {
          await incrementStock(order.products || [], order._id, 'order-deleted');
        } catch (stockErr) {
          console.error(`Error incrementing stock for bulk-deleted order ${order._id}:`, stockErr);
        }
      }
    }

    // Delete orders
    const deleteResult = await Order.deleteMany({ _id: { $in: ids } });
    
    // Also delete associated sales if they exist
    await Sale.deleteMany({ orderId: { $in: ids } });
    
    res.json({ 
      success: true, 
      deletedCount: deleteResult.deletedCount 
    });
  } catch (err) {
    console.error('Error bulk deleting orders:', err);
    res.status(500).json({ message: 'Error bulk deleting orders' });
  }
});

// Delete single order
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Increment stock if the order was in an approved status
    const approvedStatuses = ['processing', 'shipped', 'delivered'];
    if (approvedStatuses.includes(String(order.status || '').toLowerCase())) {
      try {
        await incrementStock(order.products || [], order._id, 'order-deleted');
      } catch (stockErr) {
        console.error(`Error incrementing stock for deleted order ${order._id}:`, stockErr);
      }
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    // Also delete associated sale if it exists
    await Sale.deleteOne({ orderId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ message: 'Error deleting order' });
  }
});

// Users management
router.get('/users', async (req, res) => {
  try {
    // Fetch all users with user role
    const users = await User.find({ role: 'user' })
      .sort({ createdAt: -1 })
      .populate({ path: 'orders', select: 'createdAt totalAmount' });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    // Do not allow deleting admins
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin users' });

    await User.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

router.delete('/users', async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No user IDs provided' });
    }
    const result = await User.deleteMany({ _id: { $in: ids }, role: 'user' });
    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error bulk deleting users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('orders');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

router.get('/users/email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }).populate('orders');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

router.put('/users/:id/notes', async (req, res) => {
  try {
    const { category, message, isHighPriority, addedBy } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.notes.push({ category, message, isHighPriority, addedBy });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error adding note' });
  }
});

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get counts
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();
    
    // Get total sales
    const orders = await Order.find();
    const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Get recent orders
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5);
    
    // Get top products by sales
    const topSellingData = await Sale.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
          name: { $first: "$products.title" },
          price: { $first: "$products.price" }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

    // Fetch product details for images
    const topProducts = await Promise.all(topSellingData.map(async (item) => {
      const product = await Product.findById(item._id).select('image sku');
      return {
        _id: item._id,
        name: item.name,
        price: item.price,
        sold: item.totalSold,
        image: product?.image || '',
        sku: product?.sku || ''
      };
    }));

    // If no sales yet, fallback to recent products for display
    if (topProducts.length === 0) {
      const fallbackProducts = await Product.find().limit(5).select('name price image sku');
      topProducts.push(...fallbackProducts.map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        sold: 0,
        image: p.image,
        sku: p.sku
      })));
    }
    
    // Get monthly sales data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlySales = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: "$totalAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get sales by category (mock/simple based on products for now)
    const categoryCounts = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    
    res.json({
      counts: {
        orders: totalOrders,
        users: totalUsers,
        products: totalProducts,
        sales: totalSales.toFixed(2)
      },
      recentOrders,
      topProducts,
      monthlySales,
      categoryCounts
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

// Site Settings
router.get('/site-settings', async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create({});
    }
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching site settings' });
  }
});

router.post('/site-settings', async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();
    if (settings) {
      // Use Object.assign to update fields
      Object.assign(settings, req.body);
      
      // Explicitly mark objects and arrays as modified for Mongoose
      if (req.body.hero) settings.markModified('hero');
      if (req.body.editorial) settings.markModified('editorial');
      if (req.body.collections) settings.markModified('collections');
      if (req.body.footerGroups) settings.markModified('footerGroups');
      if (req.body.social) settings.markModified('social');
      if (req.body.newsletter) settings.markModified('newsletter');
      if (req.body.legalLabels) settings.markModified('legalLabels');
      if (req.body.infoPages) settings.markModified('infoPages');
      if (req.body.budgets) settings.markModified('budgets');
      if (req.body.announcement) settings.markModified('announcement');
      
      await settings.save();
    } else {
      settings = await SiteSetting.create(req.body);
    }
    res.json({ data: settings });
  } catch (err) {
    console.error('Error updating site settings:', err);
    res.status(500).json({ message: 'Error updating site settings' });
  }
});

// Navigation
router.get('/navigation', async (req, res) => {
  try {
    const navItems = await Navigation.find().sort({ displayOrder: 1 });
    res.json({ data: navItems });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching navigation' });
  }
});

router.post('/navigation', async (req, res) => {
  try {
    // Assuming we're sending the whole navigation array
    if (Array.isArray(req.body)) {
      // Clear existing and replace or update one by one
      // For simplicity, let's just delete and recreate if the client sends the whole list
      await Navigation.deleteMany({});
      const navItems = await Navigation.insertMany(req.body);
      return res.json({ data: navItems });
    }
    
    // Single item update/create
    const { id, ...data } = req.body;
    let navItem;
    if (id) {
      navItem = await Navigation.findByIdAndUpdate(id, data, { new: true });
    } else {
      navItem = await Navigation.create(data);
    }
    res.json({ data: navItem });
  } catch (err) {
    res.status(500).json({ message: 'Error updating navigation' });
  }
});

// Discounts
router.get('/discounts', async (req, res) => {
  try {
    const discounts = await DiscountCode.find().sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching discounts' });
  }
});

router.post('/discounts', async (req, res) => {
  try {
    const { code, type, value, maxUses, expiresAt, isActive } = req.body;
    
    // Upsert logic for discounts if code exists
    const existing = await DiscountCode.findOne({ code: code.toUpperCase() });
    
    if (existing) {
      const updated = await DiscountCode.findByIdAndUpdate(existing._id, {
        type,
        value,
        maxUses,
        expiresAt,
        isActive
      }, { new: true });
      return res.json(updated);
    }
    
    const discount = await DiscountCode.create({
      code: code.toUpperCase(),
      type,
      value,
      maxUses,
      expiresAt,
      isActive
    });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ message: 'Error creating/updating discount' });
  }
});

router.delete('/discounts/:id', async (req, res) => {
  try {
    await DiscountCode.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting discount' });
  }
});

// Newsletter subscribers management
router.get('/newsletter', async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching subscribers' });
  }
});

router.delete('/newsletter/:id', async (req, res) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Subscriber removed' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting subscriber' });
  }
});

module.exports = router;
