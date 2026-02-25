const { Router } = require('express');
const fileUpload = require('express-fileupload');
const Offer = require('../models/Offer');
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

// Get all active offers
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ active: true }).sort({ displayOrder: 1 });
    res.json(offers);
  } catch (err) {
    console.error('Error fetching offers:', err);
    res.status(500).json({ message: 'Error fetching offers' });
  }
});

// Admin routes

// Get all offers (including inactive)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const offers = await Offer.find().sort({ displayOrder: 1 });
    res.json(offers);
  } catch (err) {
    console.error('Error fetching offers:', err);
    res.status(500).json({ message: 'Error fetching offers' });
  }
});

// Get single offer
router.get('/admin/:id', adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    res.json(offer);
  } catch (err) {
    console.error('Error fetching offer:', err);
    res.status(500).json({ message: 'Error fetching offer' });
  }
});

// Create new offer (align with product upload logic and allow URL mode)
router.post('/admin', adminAuth, async (req, res) => {
  try {
    const { title, description, link, active, displayOrder, imageUrl } = req.body;

    let newOfferData = {
      title,
      description,
      link: link || '/products',
      active: active === 'true',
      displayOrder: displayOrder || 0
    };

    if (req.files && req.files.image) {
      const file = req.files.image;
      if (!file.mimetype.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image files are allowed' });
      }
      const uploadResponse = await uploadImage(file, 'arlenco/offers', 'offer');
      newOfferData.imageUrl = uploadResponse.url;
      newOfferData.imageId = uploadResponse.path; // relative path
      newOfferData.thumbnailUrl = uploadResponse.thumbnailUrl;
    } else if (imageUrl) {
      // URL mode: allow external image URL, imageId stays empty (model default '')
      newOfferData.imageUrl = imageUrl;
      newOfferData.imageId = '';
      newOfferData.thumbnailUrl = '';
    } else {
      return res.status(400).json({ message: 'Image is required' });
    }

    const offer = await Offer.create(newOfferData);
    res.status(201).json(offer);
  } catch (err) {
    console.error('Error creating offer:', err);
    res.status(500).json({ message: 'Error creating offer' });
  }
});

// Update offer
router.put('/admin/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, link, active, displayOrder } = req.body;
    
    const updateData = {
      title,
      description,
      link: link || '/products',
      active: active === 'true',
      displayOrder: displayOrder || 0
    };
    
    // If new image is uploaded, update image data
    if (req.files && req.files.image) {
      // Get existing offer to delete old image
      const existingOffer = await Offer.findById(req.params.id);
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

      const uploadResponse = await uploadImage(file, 'arlenco/offers', 'offer');
      updateData.imageUrl = uploadResponse.url;
      updateData.imageId = uploadResponse.path;
      updateData.thumbnailUrl = uploadResponse.thumbnailUrl;
    }
    
    // Update offer
    const updatedOffer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    res.json(updatedOffer);
  } catch (err) {
    console.error('Error updating offer:', err);
    res.status(500).json({ message: 'Error updating offer' });
  }
});

// Delete offer
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    // Delete image from ImageKit if it exists
    if (offer.imageId) {
      try {
        // Extract fileId from path if needed
        const fileId = offer.imageId.split('/').pop();
        await imagekit.deleteFile(fileId);
      } catch (deleteErr) {
        console.error('Error deleting image:', deleteErr);
        // Continue with deletion even if image delete fails
      }
    }
    
    // Delete offer from database
    await Offer.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('Error deleting offer:', err);
    res.status(500).json({ message: 'Error deleting offer' });
  }
});

module.exports = router;