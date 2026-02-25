const { Router } = require('express');
const fileUpload = require('express-fileupload');
const Category = require('../models/Category');
const GalleryImage = require('../models/GalleryImage');
const imagekit = require('../utils/imagekit');
const { uploadImage, deleteImage } = require('../utils/imageUpload');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// Middleware for file uploads (match product route behavior)
router.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Public routes

// Get all active categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

// Get gallery images by category
router.get('/images/:categorySlug?', async (req, res) => {
  try {
    const { categorySlug } = req.params;
    let query = {};
    
    if (categorySlug && categorySlug !== 'all') {
      const category = await Category.findOne({ slug: categorySlug });
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      query.category = category._id;
    }
    
    const images = await GalleryImage.find(query)
      .populate('category')
      .populate('relatedProducts')
      .sort({ displayOrder: 1 });
      
    res.json(images);
  } catch (err) {
    console.error('Error fetching gallery images:', err);
    res.status(500).json({ message: 'Error fetching gallery images' });
  }
});

// Get featured gallery images
router.get('/featured', async (req, res) => {
  try {
    const featuredImages = await GalleryImage.find({ featured: true })
      .populate('category')
      .sort({ displayOrder: 1 })
      .limit(6);
      
    res.json(featuredImages);
  } catch (err) {
    console.error('Error fetching featured images:', err);
    res.status(500).json({ message: 'Error fetching featured images' });
  }
});

// Admin routes (protected)
router.use('/admin', adminAuth);

// Category management
router.get('/admin/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

router.post('/admin/categories', async (req, res) => {
  try {
    const { name, description, slug, isActive, displayOrder } = req.body;
    
    // Check if category with same name or slug exists
    const existingCategory = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category with this name or slug already exists' });
    }
    
    const categoryData = {
      name,
      description,
      slug,
      isActive: isActive === 'true' || isActive === true,
      displayOrder: parseInt(displayOrder) || 0
    };

    // Handle image upload if provided
    if (req.files && req.files.image) {
      const file = req.files.image;
      const uploadResponse = await uploadImage(file, 'arlenco/categories', 'category');
      categoryData.imageUrl = uploadResponse.url;
      categoryData.imageId = uploadResponse.path;
      categoryData.thumbnailUrl = uploadResponse.thumbnailUrl;
    }
    
    const category = await Category.create(categoryData);
    
    res.status(201).json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Error creating category' });
  }
});

router.put('/admin/categories/:id', async (req, res) => {
  try {
    const { name, description, slug, isActive, displayOrder } = req.body;
    
    // Check if another category with same name or slug exists
    const existingCategory = await Category.findOne({
      $and: [
        { _id: { $ne: req.params.id } },
        { $or: [{ name }, { slug }] }
      ]
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Another category with this name or slug already exists' });
    }
    
    const updateData = {
      name,
      description,
      slug,
      isActive: isActive === 'true' || isActive === true,
      displayOrder: parseInt(displayOrder) || 0
    };

    // If new image is uploaded, update image data
    if (req.files && req.files.image) {
      // Get existing category to delete old image
      const existing = await Category.findById(req.params.id);
      if (existing && existing.imageId) {
        try {
          // Find fileId for the old image
          const files = await imagekit.listFiles({
            path: '/arlenco/categories',
            limit: 100
          });
          
          const fileToDelete = files.find(file => {
            const filePath = new URL(file.url).pathname.replace('/rohanKashyap', '');
            return filePath === existing.imageId;
          });
          
          if (fileToDelete) {
            await imagekit.deleteFile(fileToDelete.fileId);
          }
        } catch (deleteErr) {
          console.error('Error deleting old category image:', deleteErr);
        }
      }
      
      // Upload new image
      const file = req.files.image;
      const uploadResponse = await uploadImage(file, 'arlenco/categories', 'category');
      updateData.imageUrl = uploadResponse.url;
      updateData.imageId = uploadResponse.path;
      updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(updatedCategory);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Error updating category' });
  }
});

router.delete('/admin/categories/:id', async (req, res) => {
  try {
    // Check if category is used in any gallery images
    const imagesUsingCategory = await GalleryImage.countDocuments({ category: req.params.id });
    if (imagesUsingCategory > 0) {
      return res.status(400).json({
        message: `Cannot delete category. It is used by ${imagesUsingCategory} gallery images.`
      });
    }
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete image from ImageKit if exists
    if (category.imageId) {
      try {
        const files = await imagekit.listFiles({
          path: '/arlenco/categories',
          limit: 100
        });
        
        const fileToDelete = files.find(file => {
          const filePath = new URL(file.url).pathname.replace('/rohanKashyap', '');
          return filePath === category.imageId;
        });
        
        if (fileToDelete) {
          await imagekit.deleteFile(fileToDelete.fileId);
        }
      } catch (deleteErr) {
        console.error('Error deleting category image from ImageKit:', deleteErr);
      }
    }
    
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Error deleting category' });
  }
});

// Gallery image management
router.get('/admin/images', async (req, res) => {
  try {
    const images = await GalleryImage.find()
      .populate('category')
      .populate('relatedProducts')
      .sort({ createdAt: -1 });
      
    res.json(images);
  } catch (err) {
    console.error('Error fetching gallery images:', err);
    res.status(500).json({ message: 'Error fetching gallery images' });
  }
});

// Get single gallery image by ID
router.get('/admin/images/:id', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id)
      .populate('category')
      .populate('relatedProducts');
    
    if (!image) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    res.json(image);
  } catch (err) {
    console.error('Error fetching gallery image:', err);
    res.status(500).json({ message: 'Error fetching gallery image' });
  }
});

router.post('/admin/images', async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }
    
    const { title, description, category, tags, altText, featured, displayOrder, relatedProducts } = req.body;
    
    // Upload image to ImageKit (reuse same util as products)
    const file = req.files.image;
    const uploadResponse = await uploadImage(file, 'arlenco/gallery', 'gallery');

    // Log the ImageKit URL for debugging
    console.log('ImageKit URL:', uploadResponse.url);
    console.log('Using path for IKImage:', uploadResponse.path);

    const galleryImage = await GalleryImage.create({
      title,
      description,
      imageUrl: uploadResponse.url,
      imageId: uploadResponse.path, // store relative path like products
      thumbnailUrl: uploadResponse.thumbnailUrl,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      altText,
      featured: featured === 'true',
      displayOrder: displayOrder || 0,
      relatedProducts: relatedProducts ? relatedProducts.split(',') : []
    });
    
    // Populate references for response
    await galleryImage.populate('category');
    await galleryImage.populate('relatedProducts');
    
    res.status(201).json(galleryImage);
  } catch (err) {
    console.error('Error uploading gallery image:', err);
    res.status(500).json({ message: 'Error uploading gallery image' });
  }
});

router.put('/admin/images/:id', async (req, res) => {
  try {
    const { title, description, category, tags, altText, featured, displayOrder, relatedProducts } = req.body;
    
    const updateData = {
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      altText,
      featured: featured === 'true',
      displayOrder: displayOrder || 0,
      relatedProducts: relatedProducts ? relatedProducts.split(',') : []
    };
    
    // If new image is uploaded, update image data
    if (req.files && req.files.image) {
      // Get existing image to delete old one
      const existingImage = await GalleryImage.findById(req.params.id);
      if (existingImage && existingImage.imageId) {
        try {
          // We stored relative path in imageId when uploading via util. Use delete by fileId via util in products for consistency.
          const { deleteImage } = require('../utils/imageUpload');
          await deleteImage(existingImage.imageId);
        } catch (deleteErr) {
          console.error('Error deleting old image:', deleteErr);
        }
      }
      
      // Upload new image (reuse util)
      const file = req.files.image;
      const uploadResponse = await uploadImage(file, 'arlenco/gallery', 'gallery');
      
      // Log for debugging
      console.log('ImageKit URL:', uploadResponse.url);
      console.log('Using path for IKImage:', uploadResponse.path);
      
      // Add new image data to update
      updateData.imageUrl = uploadResponse.url;
      updateData.imageId = uploadResponse.path;
      updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
    }
    
    // Update gallery image
    const updatedImage = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedImage) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    // Populate references for response
    await updatedImage.populate('category');
    await updatedImage.populate('relatedProducts');
    
    res.json(updatedImage);
  } catch (err) {
    console.error('Error updating gallery image:', err);
    res.status(500).json({ message: 'Error updating gallery image' });
  }
});

router.delete('/admin/images/:id', async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    // Delete image from ImageKit
    if (image.imageId) {
      try {
        // Since we're now storing the path in imageId instead of fileId,
        // we need to find the fileId by listing files and matching the path
        const files = await imagekit.listFiles({
          path: '/arlenco/gallery',
          limit: 100
        });
        
        // Find the file with the matching path
        const fileToDelete = files.find(file => {
          const filePath = new URL(file.url).pathname.replace('/rohanKashyap', '');
          return filePath === image.imageId;
        });
        
        if (fileToDelete) {
          await imagekit.deleteFile(fileToDelete.fileId);
          console.log('Deleted file with fileId:', fileToDelete.fileId);
        } else {
          console.error('Could not find matching file to delete');
        }
      } catch (deleteErr) {
        console.error('Error deleting image from ImageKit:', deleteErr);
        // Continue with deletion even if ImageKit delete fails
      }
    }
    
    // Delete image record from database
    await GalleryImage.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Gallery image deleted successfully' });
  } catch (err) {
    console.error('Error deleting gallery image:', err);
    res.status(500).json({ message: 'Error deleting gallery image' });
  }
});

module.exports = router;
