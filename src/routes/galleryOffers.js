const { Router } = require('express');
const fileUpload = require('express-fileupload');
const GalleryOffer = require('../models/GalleryOffer');
const adminAuth = require('../middleware/adminAuth');
const imagekit = require('../utils/imagekit');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

const router = Router();

// Middleware for file uploads
router.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Public routes

// Get all active gallery offers
router.get('/', async (req, res) => {
  try {
    const offers = await GalleryOffer.find({ active: true }).sort({ displayOrder: 1 });
    res.json(offers);
  } catch (err) {
    console.error('Error fetching gallery offers:', err);
    res.status(500).json({ message: 'Error fetching gallery offers' });
  }
});

// Admin routes

// Get all gallery offers (including inactive)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const offers = await GalleryOffer.find().sort({ displayOrder: 1 });
    res.json(offers);
  } catch (err) {
    console.error('Error fetching gallery offers:', err);
    res.status(500).json({ message: 'Error fetching gallery offers' });
  }
});

// Get single gallery offer
router.get('/admin/:id', adminAuth, async (req, res) => {
  try {
    const offer = await GalleryOffer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Gallery offer not found' });
    }
    res.json(offer);
  } catch (err) {
    console.error('Error fetching gallery offer:', err);
    res.status(500).json({ message: 'Error fetching gallery offer' });
  }
});

// Create new gallery offer
router.post('/admin', adminAuth, async (req, res) => {
  try {
    const { variant, title1, title2, description, campaign, link, active, displayOrder, imageUrl } = req.body;

    let newOfferData = {
      variant,
      title1,
      title2,
      description,
      campaign,
      link: link || '/products',
      active: active === 'true' || active === true,
      displayOrder: parseInt(displayOrder) || 0
    };

    if (req.files && req.files.image) {
      const file = req.files.image;
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }
      const uploadResponse = await uploadImage(file, 'arlenco/gallery-offers', 'gallery-offer');
      newOfferData.imageUrl = uploadResponse.url;
      newOfferData.imageId = uploadResponse.path;
      newOfferData.thumbnailUrl = uploadResponse.thumbnailUrl;
    } else if (imageUrl) {
      newOfferData.imageUrl = imageUrl;
      newOfferData.imageId = '';
      newOfferData.thumbnailUrl = '';
    } else {
      return res.status(400).json({ message: 'Image is required' });
    }

    const offer = await GalleryOffer.create(newOfferData);
    res.status(201).json(offer);
  } catch (err) {
    console.error('Error creating gallery offer:', err);
    res.status(500).json({ message: 'Error creating gallery offer' });
  }
});

// Update gallery offer
router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    const { variant, title1, title2, description, campaign, link, active, displayOrder, imageUrl } = req.body;
    
    const updateData = {};
    if (variant !== undefined) updateData.variant = variant;
    if (title1 !== undefined) updateData.title1 = title1;
    if (title2 !== undefined) updateData.title2 = title2;
    if (description !== undefined) updateData.description = description;
    if (campaign !== undefined) updateData.campaign = campaign;
    if (link !== undefined) updateData.link = link;
    if (active !== undefined) updateData.active = active === 'true' || active === true;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder) || 0;
    
    // If new image is uploaded, update image data
    if (req.files && req.files.image) {
      const existingOffer = await GalleryOffer.findById(req.params.id);
      if (existingOffer && existingOffer.imageId) {
        try {
          await deleteImage(existingOffer.imageId);
        } catch (deleteErr) {
          console.error('Error deleting old image:', deleteErr);
        }
      }

      const file = req.files.image;
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }

      const uploadResponse = await uploadImage(file, 'arlenco/gallery-offers', 'gallery-offer');
      updateData.imageUrl = uploadResponse.url;
      updateData.imageId = uploadResponse.path;
      updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
    } else if (imageUrl) {
      updateData.imageUrl = imageUrl;
    }
    
    const updatedOffer = await GalleryOffer.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedOffer) {
      return res.status(404).json({ message: 'Gallery offer not found' });
    }
    
    res.json(updatedOffer);
  } catch (err) {
    console.error('Error updating gallery offer:', err);
    res.status(500).json({ message: 'Error updating gallery offer' });
  }
});

// Delete gallery offer
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const offer = await GalleryOffer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Gallery offer not found' });
    }
    
    if (offer.imageId) {
      try {
        await deleteImage(offer.imageId);
      } catch (deleteErr) {
        console.error('Error deleting image:', deleteErr);
      }
    }
    
    await GalleryOffer.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Gallery offer deleted successfully' });
  } catch (err) {
    console.error('Error deleting gallery offer:', err);
    res.status(500).json({ message: 'Error deleting gallery offer' });
  }
});

module.exports = router;
