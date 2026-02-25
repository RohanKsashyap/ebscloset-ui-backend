const { Router } = require('express');
const fileUpload = require('express-fileupload');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Sale = require('../models/Sale');
const InventoryLog = require('../models/InventoryLog');
const Contact = require('../models/Contact');
const adminAuth = require('../middleware/adminAuth');
const { uploadImage, deleteImage } = require('../utils/imageUpload');
const { incrementStock } = require('../utils/inventory');

const router = Router();
router.use(adminAuth);

// Middleware for file uploads
router.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

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
    const { name, price, description, categoryId, inStock, minStock, featured } = req.body;
    
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
    if (req.files && req.files.image) {
      console.log('Processing file upload for product creation');
      try {
        const uploadResponse = await uploadImage(req.files.image, 'arlenco/products', 'product');
        imageUrl = uploadResponse.url;
        imageId = uploadResponse.path; // Use the path directly from uploadResponse
        thumbnailUrl = uploadResponse.thumbnailUrl;
        console.log('File upload successful:', { url: imageUrl, path: imageId });
      } catch (uploadError) {
        console.error('File upload failed:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    } else if (req.body.image) {
      // If image URL is provided directly
      imageUrl = req.body.image;
      console.log('Using provided image URL:', imageUrl);
    }

    // Handle hover image upload (optional)
    if (req.files && req.files.hoverImage) {
      try {
        const hoverUpload = await uploadImage(req.files.hoverImage, 'arlenco/products', 'product-hover');
        hoverImageUrl = hoverUpload.url;
        hoverImageId = hoverUpload.path;
      } catch (uploadError) {
        console.error('Hover image upload failed:', uploadError);
        // not fatal
      }
    } else if (req.body.hoverImage) {
      hoverImageUrl = req.body.hoverImage;
    }

    // Handle image 3 upload (optional)
    if (req.files && req.files.image3) {
      try {
        const upload3 = await uploadImage(req.files.image3, 'arlenco/products', 'product-3');
        image3Url = upload3.url;
        image3Id = upload3.path;
      } catch (uploadError) {
        console.error('Image 3 upload failed:', uploadError);
      }
    } else if (req.body.image3) {
      image3Url = req.body.image3;
    }

    // Handle image 4 upload (optional)
    if (req.files && req.files.image4) {
      try {
        const upload4 = await uploadImage(req.files.image4, 'arlenco/products', 'product-4');
        image4Url = upload4.url;
        image4Id = upload4.path;
      } catch (uploadError) {
        console.error('Image 4 upload failed:', uploadError);
      }
    } else if (req.body.image4) {
      image4Url = req.body.image4;
    }

    // Handle video upload (optional)
    if (req.files && req.files.video) {
      try {
        const videoUpload = await uploadImage(req.files.video, 'arlenco/products', 'product-video');
        videoUrl = videoUpload.url;
        videoId = videoUpload.path;
      } catch (uploadError) {
        console.error('Video upload failed:', uploadError);
      }
    } else if (req.body.video) {
      videoUrl = req.body.video;
    }

    // Handle video 2 upload (optional)
    if (req.files && req.files.video2) {
      try {
        const video2Upload = await uploadImage(req.files.video2, 'arlenco/products', 'product-video-2');
        video2Url = video2Upload.url;
        video2Id = video2Upload.path;
      } catch (uploadError) {
        console.error('Video 2 upload failed:', uploadError);
      }
    } else if (req.body.video2) {
      video2Url = req.body.video2;
    }

    // Handle video 3 upload (optional)
    if (req.files && req.files.video3) {
      try {
        const video3Upload = await uploadImage(req.files.video3, 'arlenco/products', 'product-video-3');
        video3Url = video3Upload.url;
        video3Id = video3Upload.path;
      } catch (uploadError) {
        console.error('Video 3 upload failed:', uploadError);
      }
    } else if (req.body.video3) {
      video3Url = req.body.video3;
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
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      featured: featured === 'true' || featured === true,
      variants
    });
    
    res.json(product);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ message: 'Error creating product' });
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
    const allowedFields = ['featured', 'category', 'categoryId', 'inStock'];
    const updateData = {};
    
    Object.keys(update).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = update[key];
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

// In the PUT /products/:id route
router.put('/products/:id', async (req, res) => {
  try {
    const { name, price, description, categoryId, inStock, minStock, featured } = req.body;
    
    const updateData = {
      name,
      price: Number(price),
      description,
      categoryId: categoryId || null,
      inStock: Number(inStock),
      minStock: Number(minStock) || 5, // Default to 5 if not provided
      featured: featured === 'true' || featured === true
    };
    
    // Parse variants if provided
    if (req.body.variants && req.body.variants.trim() !== '') {
      try {
        updateData.variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    }
    
    // Handle image upload if file is provided
    if (req.files && req.files.image) {
      console.log('Processing file upload for product update');
      try {
        // Get existing product to delete old image
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.imageId) {
          console.log('Deleting old image:', existingProduct.imageId);
          await deleteImage(existingProduct.imageId);
        }
        
        // Upload new image
        const uploadResponse = await uploadImage(req.files.image, 'arlenco/products', 'product');
        
        // Add new image data to update
        updateData.image = uploadResponse.url;
        updateData.imageId = uploadResponse.path; // Use the path directly from uploadResponse
        updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
        console.log('File update successful:', { url: uploadResponse.url, path: uploadResponse.path });
      } catch (uploadError) {
        console.error('File upload failed during update:', uploadError);
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    } else if (req.body.image && req.body.image !== '') {
      // If image URL is provided directly and it's different from the current one
      const existingProduct = await Product.findById(req.params.id);
      if (existingProduct && existingProduct.image !== req.body.image) {
        // If there's an existing ImageKit image, delete it
        if (existingProduct.imageId) {
          await deleteImage(existingProduct.imageId);
        }
        
        // Update with new image URL
        updateData.image = req.body.image;
        updateData.imageId = ''; // Clear ImageKit ID since this is an external URL
        updateData.thumbnailUrl = ''; // Clear thumbnail URL
      }
    }

    // Optional hover image update
    if (req.files && req.files.hoverImage) {
      try {
        // delete old hover image if exists
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.hoverImageId) {
          await deleteImage(existingProduct.hoverImageId);
        }
        const hoverUpload = await uploadImage(req.files.hoverImage, 'arlenco/products', 'product-hover');
        updateData.hoverImage = hoverUpload.url;
        updateData.hoverImageId = hoverUpload.path;
      } catch (e) {
        console.error('Hover image upload failed during update:', e);
      }
    } else if (typeof req.body.hoverImage === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.hoverImage === '') {
        // remove existing alternate image and clear ids
        if (existingProduct && existingProduct.hoverImageId) {
          try { await deleteImage(existingProduct.hoverImageId); } catch (e) { console.error('Failed to delete old hover image:', e); }
        }
        updateData.hoverImage = '';
        updateData.hoverImageId = '';
      } else {
        // set to provided URL; if switching away from IK, clear id and delete old IK file
        if (existingProduct && existingProduct.hoverImageId && existingProduct.hoverImage !== req.body.hoverImage) {
          try { await deleteImage(existingProduct.hoverImageId); } catch (e) { console.error('Failed to delete old hover image:', e); }
        }
        updateData.hoverImage = req.body.hoverImage;
        if (!(req.body.hoverImage || '').includes('ik.imagekit.io')) {
          updateData.hoverImageId = '';
        }
      }
    }

    // Optional image 3 update
    if (req.files && req.files.image3) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.image3Id) {
          await deleteImage(existingProduct.image3Id);
        }
        const upload3 = await uploadImage(req.files.image3, 'arlenco/products', 'product-3');
        updateData.image3 = upload3.url;
        updateData.image3Id = upload3.path;
      } catch (e) {
        console.error('Image 3 upload failed during update:', e);
      }
    } else if (typeof req.body.image3 === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.image3 === '') {
        if (existingProduct && existingProduct.image3Id) {
          try { await deleteImage(existingProduct.image3Id); } catch (e) { console.error('Failed to delete old image3:', e); }
        }
        updateData.image3 = '';
        updateData.image3Id = '';
      } else {
        if (existingProduct && existingProduct.image3Id && existingProduct.image3 !== req.body.image3) {
          try { await deleteImage(existingProduct.image3Id); } catch (e) { console.error('Failed to delete old image3:', e); }
        }
        updateData.image3 = req.body.image3;
        if (!(req.body.image3 || '').includes('ik.imagekit.io')) {
          updateData.image3Id = '';
        }
      }
    }

    // Optional image 4 update
    if (req.files && req.files.image4) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.image4Id) {
          await deleteImage(existingProduct.image4Id);
        }
        const upload4 = await uploadImage(req.files.image4, 'arlenco/products', 'product-4');
        updateData.image4 = upload4.url;
        updateData.image4Id = upload4.path;
      } catch (e) {
        console.error('Image 4 upload failed during update:', e);
      }
    } else if (typeof req.body.image4 === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.image4 === '') {
        if (existingProduct && existingProduct.image4Id) {
          try { await deleteImage(existingProduct.image4Id); } catch (e) { console.error('Failed to delete old image4:', e); }
        }
        updateData.image4 = '';
        updateData.image4Id = '';
      } else {
        if (existingProduct && existingProduct.image4Id && existingProduct.image4 !== req.body.image4) {
          try { await deleteImage(existingProduct.image4Id); } catch (e) { console.error('Failed to delete old image4:', e); }
        }
        updateData.image4 = req.body.image4;
        if (!(req.body.image4 || '').includes('ik.imagekit.io')) {
          updateData.image4Id = '';
        }
      }
    }

    // Optional video update
    if (req.files && req.files.video) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.videoId) {
          await deleteImage(existingProduct.videoId);
        }
        const videoUpload = await uploadImage(req.files.video, 'arlenco/products', 'product-video');
        updateData.video = videoUpload.url;
        updateData.videoId = videoUpload.path;
      } catch (e) {
        console.error('Video upload failed during update:', e);
      }
    } else if (typeof req.body.video === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.video === '') {
        if (existingProduct && existingProduct.videoId) {
          try { await deleteImage(existingProduct.videoId); } catch (e) { console.error('Failed to delete old video:', e); }
        }
        updateData.video = '';
        updateData.videoId = '';
      } else {
        if (existingProduct && existingProduct.videoId && existingProduct.video !== req.body.video) {
          try { await deleteImage(existingProduct.videoId); } catch (e) { console.error('Failed to delete old video:', e); }
        }
        updateData.video = req.body.video;
        if (!(req.body.video || '').includes('ik.imagekit.io')) {
          updateData.videoId = '';
        }
      }
    }

    // Optional video 2 update
    if (req.files && req.files.video2) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.video2Id) {
          await deleteImage(existingProduct.video2Id);
        }
        const video2Upload = await uploadImage(req.files.video2, 'arlenco/products', 'product-video-2');
        updateData.video2 = video2Upload.url;
        updateData.video2Id = video2Upload.path;
      } catch (e) {
        console.error('Video 2 upload failed during update:', e);
      }
    } else if (typeof req.body.video2 === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.video2 === '') {
        if (existingProduct && existingProduct.video2Id) {
          try { await deleteImage(existingProduct.video2Id); } catch (e) { console.error('Failed to delete old video 2:', e); }
        }
        updateData.video2 = '';
        updateData.video2Id = '';
      } else {
        if (existingProduct && existingProduct.video2Id && existingProduct.video2 !== req.body.video2) {
          try { await deleteImage(existingProduct.video2Id); } catch (e) { console.error('Failed to delete old video 2:', e); }
        }
        updateData.video2 = req.body.video2;
        if (!(req.body.video2 || '').includes('ik.imagekit.io')) {
          updateData.video2Id = '';
        }
      }
    }

    // Optional video 3 update
    if (req.files && req.files.video3) {
      try {
        const existingProduct = await Product.findById(req.params.id);
        if (existingProduct && existingProduct.video3Id) {
          await deleteImage(existingProduct.video3Id);
        }
        const video3Upload = await uploadImage(req.files.video3, 'arlenco/products', 'product-video-3');
        updateData.video3 = video3Upload.url;
        updateData.video3Id = video3Upload.path;
      } catch (e) {
        console.error('Video 3 upload failed during update:', e);
      }
    } else if (typeof req.body.video3 === 'string') {
      const existingProduct = await Product.findById(req.params.id);
      if (req.body.video3 === '') {
        if (existingProduct && existingProduct.video3Id) {
          try { await deleteImage(existingProduct.video3Id); } catch (e) { console.error('Failed to delete old video 3:', e); }
        }
        updateData.video3 = '';
        updateData.video3Id = '';
      } else {
        if (existingProduct && existingProduct.video3Id && existingProduct.video3 !== req.body.video3) {
          try { await deleteImage(existingProduct.video3Id); } catch (e) { console.error('Failed to delete old video 3:', e); }
        }
        updateData.video3 = req.body.video3;
        if (!(req.body.video3 || '').includes('ik.imagekit.io')) {
          updateData.video3Id = '';
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
    res.status(500).json({ message: 'Error updating product' });
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
      // Note: Stock is now decremented at the time of order placement (checkout.js)
    } 
    
    // If status is changing to 'returned' or 'cancelled', and it wasn't already in that state,
    // we need to increment the stock back.
    const isReturning = (newStatus === 'returned' && oldStatus !== 'returned');
    const isCancelling = (newStatus === 'cancelled' && oldStatus !== 'cancelled');

    if (isReturning || isCancelling) {
      const reason = isReturning ? 'order-returned' : 'order-cancelled';
      try {
        await incrementStock(order.products || [], order._id, reason);
      } catch (stockErr) {
        console.error(`Error incrementing stock for order ${order._id}:`, stockErr);
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

// Delete single order
router.delete('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Also delete associated sale if it exists
    await Sale.deleteOne({ orderId: req.params.id });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting order' });
  }
});

// Bulk delete orders
router.delete('/orders', async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'No order IDs provided' });
    }

    // Delete orders
    const deleteResult = await Order.deleteMany({ _id: { $in: orderIds } });
    
    // Delete associated sales
    await Sale.deleteMany({ orderId: { $in: orderIds } });
    
    res.json({ 
      success: true, 
      deletedCount: deleteResult.deletedCount 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error bulk deleting orders' });
  }
});

// Users management
router.get('/users', async (req, res) => {
  try {
    // Only users (not admins) that have at least one order
    const users = await User.find({ role: 'user', 'orders.0': { $exists: true } })
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
    
    // Get top products (mock data for now)
    const topProducts = await Product.find().limit(5);
    
    // Monthly sales data (last 6 months)
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
    
    res.json({
      counts: {
        orders: totalOrders,
        users: totalUsers,
        products: totalProducts,
        sales: totalSales.toFixed(2)
      },
      recentOrders,
      topProducts,
      monthlySales
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

module.exports = router;
