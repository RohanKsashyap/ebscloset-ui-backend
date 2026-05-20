const { Router } = require('express');
const mongoose = require('mongoose');
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
const Category = require('../models/Category');
const AgeCategory = require('../models/AgeCategory');
const Blog = require('../models/Blog');
const adminAuth = require('../middleware/adminAuth');
const { uploadImage, uploadImageFromUrl, deleteImage } = require('../utils/imageUpload');
const { incrementStock, decrementStock } = require('../utils/inventory');
const { sendOrderConfirmation } = require('../utils/email');
const { generateSKU } = require('../utils/sku');
const crypto = require('crypto');

const router = Router();
router.use(adminAuth);

// Helper to generate slug
const generateSlug = (name) => {
  const baseSlug = name.toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
  const random = crypto.randomBytes(3).toString('hex');
  return `${baseSlug}-${random}`;
};

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
    const { categoryId, search } = req.query;
    let query = {};

    if (categoryId && categoryId !== 'all') {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).populate('categoryId', 'name slug');
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Search suggestions endpoint
router.get('/products/suggestions', async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) return res.json([]);

    const suggestions = await Product.find({
      name: { $regex: search, $options: 'i' }
    })
    .select('name image price categoryId')
    .limit(5)
    .populate('categoryId', 'name');

    res.json(suggestions);
  } catch (err) {
    console.error('Error fetching suggestions:', err);
    res.status(500).json({ message: 'Error fetching suggestions' });
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
    const colors = req.body.colors || [];
    const minStock = req.body.minStock;
    const trending = req.body.trending;
    const bestseller = req.body.bestseller;
    const newarrival = req.body.newarrival;
    const assured = req.body.assured;
    const ageGroups = req.body.ageGroups || [];
    const brand = sanitizeString(req.body.brand);
    
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
    
    // Parse colors and sizes to generate variants
    const parsedColors = Array.isArray(colors) ? colors : (colors ? [colors] : []);
    const parsedSizes = Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []);

    // Parse variants if provided manually (backward compatibility)
    let variants = [];
    if (req.body.variants && typeof req.body.variants === 'string' && req.body.variants.trim() !== '') {
      try {
        const parsedVariants = JSON.parse(req.body.variants);
        if (Array.isArray(parsedVariants)) {
          variants = parsedVariants.map(v => {
            // Map frontend format to backend model structure
            const vColor = v.attributes?.color || v.color || v.name || '';
            const vSize = v.attributes?.size || v.size || '';
            
            return {
              sku: v.sku || generateSKU(name, vColor, vSize),
              attributes: {
                color: vColor || undefined,
                size: vSize || undefined
              },
              price: Number(v.price || price || 0),
              stock: {
                quantity: Number(v.stock?.quantity ?? v.inStock ?? 0),
                minStock: Number(v.stock?.minStock ?? minStock ?? 5)
              },
              // Keep legacy fields for compatibility
              name: v.name || `${name}${vColor ? ' - ' + vColor : ''}${vSize ? ' - ' + vSize : ''}`,
              inStock: Number(v.inStock ?? v.stock?.quantity ?? 0)
            };
          });
        }
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    }

    // Auto-generate variants ONLY if none provided from frontend
    if (variants.length === 0 && (parsedColors.length > 0 || parsedSizes.length > 0)) {
      const colorsToLoop = parsedColors.length > 0 ? parsedColors : [''];
      const sizesToLoop = parsedSizes.length > 0 ? parsedSizes : [''];

      for (const c of colorsToLoop) {
        for (const s of sizesToLoop) {
          variants.push({
            sku: generateSKU(name, c, s),
            attributes: {
              color: c || undefined,
              size: s || undefined
            },
            price: Number(price),
            stock: {
              quantity: Number(inStock) || 0,
              minStock: Number(minStock) || 5
            },
            // Legacy mapping
            name: `${name}${c ? ' - ' + c : ''}${s ? ' - ' + s : ''}`,
            inStock: Number(inStock) || 0
          });
        }
      }
    } else if (variants.length === 0) {
      // Create a default variant if no options provided
      variants.push({
        sku: generateSKU(name),
        attributes: {},
        price: Number(price),
        stock: {
          quantity: Number(inStock) || 0,
          minStock: Number(minStock) || 5
        },
        name: name,
        inStock: Number(inStock) || 0
      });
    }
    
    const totalStockFromVariants = variants && variants.length > 0
      ? variants.reduce((sum, v) => sum + (Number(v.stock?.quantity ?? v.inStock ?? 0)), 0)
      : Number(inStock) || 0;

    // Auto-sync sizes and colors arrays from variants if they exist
    let finalSizes = parsedSizes;
    let finalColors = parsedColors;
    let finalColor = color || '';

    if (variants && variants.length > 0) {
      const variantSizes = new Set(variants.map(v => v.attributes?.size || v.size).filter(Boolean));
      const variantColors = new Set(variants.map(v => v.attributes?.color || v.color).filter(Boolean));
      
      if (variantSizes.size > 0) finalSizes = Array.from(variantSizes);
      if (variantColors.size > 0) finalColors = Array.from(variantColors);
      if (variantColors.size === 1) finalColor = Array.from(variantColors)[0];
    }

    const product = await Product.create({
      id: (req.body.id && req.body.id !== '' && !isNaN(Number(req.body.id))) ? Number(req.body.id) : undefined,
      name,
      slug: generateSlug(name),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description,
      brand,
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
      inStock: totalStockFromVariants,
      size: size || '',
      sizes: finalSizes,
      color: finalColor,
      colors: finalColors,
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      trending: trending === 'true' || trending === true,
      bestseller: bestseller === 'true' || bestseller === true,
      newarrival: newarrival === 'true' || newarrival === true,
      assured: assured === 'true' || assured === true,
      ageGroups: (Array.isArray(ageGroups) ? ageGroups : [ageGroups]).filter(group => group && group !== 'undefined'),
      variants
    });
    
    res.json(product);
  } catch (err) {
    console.error('Error creating product. Body:', req.body);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      message: 'Error creating product', 
      error: err.message,
      details: err.errors // Include Mongoose validation details if present
    });
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
    const allowedFields = ['trending', 'bestseller', 'newarrival', 'category', 'categoryId', 'inStock', 'size', 'sizes', 'color', 'assured', 'ageGroups'];
    const updateData = {};
    
    Object.keys(update).forEach(key => {
      if (allowedFields.includes(key)) {
        if (['category', 'size', 'color'].includes(key)) {
          updateData[key] = sanitizeString(update[key]);
        } else if (key === 'sizes' || key === 'ageGroups') {
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

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const name = sanitizeString(req.body.name);
    const price = req.body.price;
    const originalPrice = req.body.originalPrice;
    const description = sanitizeString(req.body.description);
    const categoryId = sanitizeString(req.body.categoryId);
    const brand = sanitizeString(req.body.brand);
    const inStock = req.body.inStock;
    const size = sanitizeString(req.body.size);
    const sizes = req.body.sizes || [];
    const color = sanitizeString(req.body.color);
    const colors = req.body.colors || [];
    const minStock = req.body.minStock;
    const trending = req.body.trending;
    const bestseller = req.body.bestseller;
    const newarrival = req.body.newarrival;
    const assured = req.body.assured;
    const ageGroups = req.body.ageGroups || [];
    
    const updateData = {
      name,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      description,
      brand,
      categoryId: categoryId || null,
      inStock: Number(inStock) || 0,
      size: size || '',
      sizes: Array.isArray(sizes) ? sizes : (sizes ? [sizes] : []),
      color: color || '',
      colors: Array.isArray(colors) ? colors : (colors ? [colors] : []),
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      trending: trending === 'true' || trending === true,
      bestseller: bestseller === 'true' || bestseller === true,
      newarrival: newarrival === 'true' || newarrival === true,
      assured: assured === 'true' || assured === true,
      ageGroups: (Array.isArray(ageGroups) ? ageGroups : [ageGroups]).filter(group => group && group !== 'undefined')
    };

    if (req.body.id && req.body.id !== '' && !isNaN(Number(req.body.id))) {
      updateData.id = Number(req.body.id);
    }

    // Update slug if name changed
    if (name && name !== existingProduct.name) {
      updateData.slug = generateSlug(name);
    } else if (!existingProduct.slug) {
      // Ensure existing products get a slug if they don't have one
      updateData.slug = generateSlug(existingProduct.name);
    }
    
    // Parse variants if provided
    let variants = [];
    if (req.body.variants && typeof req.body.variants === 'string' && req.body.variants.trim() !== '') {
      try {
        variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    } else if (Array.isArray(req.body.variants)) {
      variants = req.body.variants;
    }

    // Auto-generate variants if none provided and attributes exist
    if (variants.length === 0 && (updateData.colors.length > 0 || updateData.sizes.length > 0)) {
      const colorsToLoop = updateData.colors.length > 0 ? updateData.colors : [''];
      const sizesToLoop = updateData.sizes.length > 0 ? updateData.sizes : [''];

      for (const c of colorsToLoop) {
        for (const s of sizesToLoop) {
          const sku = generateSKU(name, c, s);
          
          // Try to find existing variant to preserve stock
          const existingVariant = existingProduct.variants.find(v => v.sku === sku);
          
          variants.push({
            sku,
            attributes: {
              color: c || undefined,
              size: s || undefined
            },
            price: Number(price),
            stock: {
              quantity: existingVariant ? (existingVariant.stock?.quantity ?? existingVariant.inStock ?? 0) : (Number(inStock) || 0),
              minStock: existingVariant ? (existingVariant.stock?.minStock ?? existingVariant.minStock ?? 5) : (Number(minStock) || 5)
            },
            // Legacy mapping
            name: `${name}${c ? ' - ' + c : ''}${s ? ' - ' + s : ''}`,
            inStock: existingVariant ? (existingVariant.stock?.quantity ?? existingVariant.inStock ?? 0) : (Number(inStock) || 0)
          });
        }
      }
      updateData.variants = variants;
    } else if (variants.length > 0) {
      updateData.variants = variants.map(v => {
        const vColor = v.attributes?.color || v.color || v.name || '';
        const vSize = v.attributes?.size || v.size || '';
        return {
          sku: v.sku || generateSKU(name, vColor, vSize),
          attributes: {
            color: vColor || undefined,
            size: vSize || undefined
          },
          price: Number(v.price || price || 0),
          stock: {
            quantity: Number(v.stock?.quantity ?? v.inStock ?? 0),
            minStock: Number(v.stock?.minStock ?? minStock ?? 5)
          },
          name: v.name || `${name}${vColor ? ' - ' + vColor : ''}${vSize ? ' - ' + vSize : ''}`,
          inStock: Number(v.inStock ?? v.stock?.quantity ?? 0)
        };
      });
    } else {
      // Default single variant if none exists
      const sku = generateSKU(name);
      const existingVariant = existingProduct.variants.find(v => v.sku === sku);
      
      updateData.variants = [{
        sku,
        attributes: {},
        price: Number(price),
        stock: {
          quantity: existingVariant ? (existingVariant.stock?.quantity ?? existingVariant.inStock ?? 0) : (Number(inStock) || 0),
          minStock: existingVariant ? (existingVariant.stock?.minStock ?? existingVariant.minStock ?? 5) : (Number(minStock) || 5)
        },
        name: name,
        inStock: existingVariant ? (existingVariant.stock?.quantity ?? existingVariant.inStock ?? 0) : (Number(inStock) || 0)
      }];
    }

    // Sync top-level inStock, sizes, and colors with variants
    if (updateData.variants && updateData.variants.length > 0) {
      updateData.inStock = updateData.variants.reduce((total, v) => {
        return total + (Number(v.stock?.quantity ?? v.inStock) || 0);
      }, 0);

      // Auto-sync sizes and colors arrays from variants
      const variantSizes = new Set(updateData.variants.map(v => v.attributes?.size || v.size).filter(Boolean));
      const variantColors = new Set(updateData.variants.map(v => v.attributes?.color || v.color).filter(Boolean));
      
      if (variantSizes.size > 0) updateData.sizes = Array.from(variantSizes);
      if (variantColors.size > 0) updateData.colors = Array.from(variantColors);
      if (variantColors.size === 1) updateData.color = Array.from(variantColors)[0];
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
    
    const productToUpdate = await Product.findById(req.params.id);
    if (!productToUpdate) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update fields manually
    Object.assign(productToUpdate, updateData);
    
    const updated = await productToUpdate.save();
    
    // Inventory audit logs for changes
    try {
      if (existingProduct) {
        // Product-level change
        if (typeof updateData.inStock === 'number' && updateData.inStock !== existingProduct.inStock) {
          await InventoryLog.create({
            productId: existingProduct._id,
            productName: existingProduct.name,
            change: updateData.inStock - (existingProduct.inStock || 0),
            previousStock: existingProduct.inStock || 0,
            newStock: updateData.inStock,
            reason: 'product-edit',
          });
        }
        if (Array.isArray(updateData.variants)) {
          const mapExisting = new Map((existingProduct.variants || []).map(v => [v.name, v]));
          updateData.variants.forEach(v => {
            const prev = mapExisting.get(v.name);
            if (prev && typeof v.inStock === 'number' && v.inStock !== prev.inStock) {
              InventoryLog.create({
                productId: existingProduct._id,
                productName: existingProduct.name,
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

// Category CRUD
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'products'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' }
        }
      },
      {
        $project: {
          products: 0
        }
      },
      { $sort: { displayOrder: 1, name: 1 } }
    ]);
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const { name, description, slug, isActive, displayOrder } = req.body;
    
    let imageUrl = '';
    let imageId = '';
    let thumbnailUrl = '';

    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      try {
        const uploadResponse = await uploadImage(imageFile, 'ebs-closet/categories', 'category');
        imageUrl = uploadResponse.url;
        imageId = uploadResponse.fileId;
        thumbnailUrl = uploadResponse.thumbnailUrl;
      } catch (uploadError) {
        console.error('Category image upload failed:', uploadError);
      }
    }

    const category = await Category.create({
      name,
      description,
      slug: slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: Number(displayOrder) || 0,
      imageUrl,
      imageId,
      thumbnailUrl
    });

    res.json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category', error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { name, description, slug, isActive, displayOrder } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    let imageUrl = category.imageUrl;
    let imageId = category.imageId;
    let thumbnailUrl = category.thumbnailUrl;

    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      if (category.imageId) {
        try {
          await deleteImage(category.imageId);
        } catch (err) {
          console.error('Failed to delete old category image:', err);
        }
      }
      try {
        const uploadResponse = await uploadImage(imageFile, 'ebs-closet/categories', 'category');
        imageUrl = uploadResponse.url;
        imageId = uploadResponse.fileId;
        thumbnailUrl = uploadResponse.thumbnailUrl;
      } catch (uploadError) {
        console.error('Category image upload failed:', uploadError);
      }
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.slug = slug || category.slug;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.displayOrder = displayOrder !== undefined ? Number(displayOrder) : category.displayOrder;
    category.imageUrl = imageUrl;
    category.imageId = imageId;
    category.thumbnailUrl = thumbnailUrl;

    await category.save();
    res.json(category);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.imageId) {
      try {
        await deleteImage(category.imageId);
      } catch (err) {
        console.error('Failed to delete category image:', err);
      }
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category' });
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

    // Handle stock decrement when order is approved or delivered
    const isApproved = approvedStatuses.includes(newStatus);
    if (isApproved && !order.stockDecremented) {
      try {
        await decrementStock(order.products || [], order._id);
        order.stockDecremented = true;
      } catch (stockErr) {
        console.error(`Error decrementing stock for approved/delivered order ${order._id}:`, stockErr);
      }
    }

    // Handle stock increment when order is cancelled or returned after being approved
    if (isBecomingUnapproved && order.stockDecremented) {
      const reason = newStatus === 'returned' ? 'order-returned' : 'order-cancelled';
      try {
        await incrementStock(order.products || [], order._id, reason);
        order.stockDecremented = false;
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

    // Notify customer of status change
    try {
      await sendOrderConfirmation(order);
    } catch (emailErr) {
      console.error(`Failed to send status update email for order ${order._id}:`, emailErr);
    }
    
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
      if (order.stockDecremented) {
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

    // Increment stock if the order was decremented
    if (order.stockDecremented) {
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

router.post('/users', async (req, res) => {
  try {
    const { fullName, email, password, role = 'user', phone } = req.body;
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      fullName,
      email,
      password,
      role,
      phone
    });

    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { fullName, email, role, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.role = role || user.role;
    user.phone = phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Error updating user' });
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
      try {
        let product = null;
        
        // Try to find by ObjectId if valid
        if (mongoose.Types.ObjectId.isValid(item._id)) {
          product = await Product.findById(item._id).select('image sku variants');
        } else {
          // Try to find by legacy numeric ID
          product = await Product.findOne({ id: Number(item._id) }).select('image sku variants');
        }

        // Get SKU from top level or first variant
        let sku = product?.sku || '';
        if (!sku && product?.variants?.length > 0) {
          sku = product.variants[0].sku;
        }

        return {
          _id: item._id,
          name: item.name,
          price: item.price,
          sold: item.totalSold,
          image: product?.image || '',
          sku: sku
        };
      } catch (err) {
        console.error(`Error fetching product details for dashboard: ${item._id}`, err);
        return {
          _id: item._id,
          name: item.name,
          price: item.price,
          sold: item.totalSold,
          image: '',
          sku: ''
        };
      }
    }));

    // If no sales yet, fallback to recent products for display
    if (topProducts.length === 0) {
      const fallbackProducts = await Product.find().limit(5).select('name price image sku variants');
      topProducts.push(...fallbackProducts.map(p => {
        let sku = p.sku || '';
        if (!sku && p.variants?.length > 0) {
          sku = p.variants[0].sku;
        }
        return {
          _id: p._id,
          name: p.name,
          price: p.price,
          sold: 0,
          image: p.image,
          sku: sku
        };
      }));
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

router.post('/upload-asset', async (req, res) => {
  try {
    const file = getFirstFile(req.files?.file);
    const imageUrl = req.body.url;
    const folder = req.body.folder || 'ebs-closet/site';

    let uploadResponse;

    if (file) {
      uploadResponse = await uploadImage(file, folder, 'asset');
    } else if (imageUrl) {
      uploadResponse = await uploadImageFromUrl(imageUrl, folder, 'asset');
    } else {
      return res.status(400).json({ message: 'No file or URL provided' });
    }
    
    res.json({
      url: uploadResponse.url,
      fileId: uploadResponse.fileId,
      thumbnailUrl: uploadResponse.thumbnailUrl
    });
  } catch (err) {
    console.error('Asset upload error:', err);
    res.status(500).json({ message: 'Error uploading asset', error: err.message });
  }
});

router.post('/site-settings', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Remove protected fields
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.__v;

    // Use findOneAndUpdate with upsert: true for a cleaner update
    const settings = await SiteSetting.findOneAndUpdate(
      {}, // empty filter matches the first document
      { $set: updateData },
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ data: settings });
  } catch (err) {
    console.error('Error updating site settings:', err);
    res.status(500).json({ 
      message: 'Error updating site settings', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

// Blog Management
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching blogs' });
  }
});

router.post('/blogs', async (req, res) => {
  try {
    const { title, content, excerpt, author, category, published, tags } = req.body;
    let imageUrl = '';
    let imageId = '';

    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      const upload = await uploadImage(imageFile, 'ebs-closet/blogs', 'blog');
      imageUrl = upload.url;
      imageId = upload.fileId;
    }

    const blog = await Blog.create({
      title,
      slug: generateSlug(title),
      content,
      excerpt,
      author,
      category,
      published: published === 'true' || published === true,
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags,
      image: imageUrl,
      imageId
    });

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: 'Error creating blog post' });
  }
});

router.put('/blogs/:id', async (req, res) => {
  try {
    const { title, content, excerpt, author, category, published, tags } = req.body;
    const updateData = {
      title,
      content,
      excerpt,
      author,
      category,
      published: published === 'true' || published === true,
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags
    };

    const imageFile = getFirstFile(req.files?.image);
    if (imageFile) {
      const blog = await Blog.findById(req.params.id);
      if (blog && blog.imageId) {
        await deleteImage(blog.imageId);
      }
      const upload = await uploadImage(imageFile, 'ebs-closet/blogs', 'blog');
      updateData.image = upload.url;
      updateData.imageId = upload.fileId;
    }

    const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: 'Error updating blog post' });
  }
});

router.delete('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog && blog.imageId) {
      await deleteImage(blog.imageId);
    }
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting blog post' });
  }
});

module.exports = router;
