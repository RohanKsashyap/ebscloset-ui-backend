const { Router } = require('express');
const AgeCollection = require('../models/AgeCollection');
const adminAuth = require('../middleware/adminAuth');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

const router = Router();

// GET all age collections (Public)
router.get('/', async (req, res) => {
  try {
    const collections = await AgeCollection.find().sort({ displayOrder: 1 });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching age collections' });
  }
});

// Admin Routes below
router.use(adminAuth);

// POST create age collection
router.post('/', async (req, res) => {
  try {
    const { 
      ageGroup, headline, categoryLabel, subtext, 
      overlayOpacity, duration, transition, displayOrder,
      manualMediaUrl, manualMediaType
    } = req.body;

    let mediaUrl = manualMediaUrl || '';
    let mediaId = '';
    let mediaType = manualMediaType || 'image';

    const mediaFile = req.files?.media;
    
    if (!mediaFile && !mediaUrl) {
      return res.status(400).json({ message: 'Media file or URL is required' });
    }

    if (mediaFile) {
      const isVideo = mediaFile.mimetype.startsWith('video/');
      mediaType = isVideo ? 'video' : 'image';
      
      const uploadResponse = await uploadImage(
        mediaFile, 
        'ebs-closet/age-collections', 
        `age_${ageGroup.replace('-', '_')}`
      );
      mediaUrl = uploadResponse.url;
      mediaId = uploadResponse.fileId;
    }

    const collection = await AgeCollection.create({
      ageGroup,
      mediaUrl,
      mediaId,
      mediaType,
      headline,
      categoryLabel,
      subtext,
      overlayOpacity: Number(overlayOpacity) || 45,
      duration: Number(duration) || 8.0,
      transition,
      displayOrder: Number(displayOrder) || 0
    });

    res.json(collection);
  } catch (err) {
    console.error('Error creating age collection:', err);
    res.status(500).json({ message: 'Error creating age collection', error: err.message });
  }
});

// PUT update age collection
router.put('/:id', async (req, res) => {
  try {
    const { 
      ageGroup, headline, categoryLabel, subtext, 
      overlayOpacity, duration, transition, displayOrder,
      removeMedia, manualMediaUrl, manualMediaType
    } = req.body;

    const collection = await AgeCollection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Age collection not found' });
    }

    const updateData = {
      ageGroup,
      headline,
      categoryLabel,
      subtext,
      overlayOpacity: Number(overlayOpacity) || 45,
      duration: Number(duration) || 8.0,
      transition,
      displayOrder: Number(displayOrder) || 0
    };

    if (manualMediaUrl) {
      updateData.mediaUrl = manualMediaUrl;
      updateData.mediaType = manualMediaType || 'image';
      // If we switch to a manual URL, we should probably delete the old file if it was managed by us
      if (collection.mediaId) {
        await deleteImage(collection.mediaId);
        updateData.mediaId = '';
      }
    }

    if (removeMedia === 'true' || removeMedia === true) {
      if (collection.mediaId) {
        await deleteImage(collection.mediaId);
      }
      updateData.mediaUrl = '';
      updateData.mediaId = '';
      updateData.mediaType = 'image';
    }

    const mediaFile = req.files?.media;
    if (mediaFile) {
      // Delete old media
      if (collection.mediaId) {
        await deleteImage(collection.mediaId);
      }

      const isVideo = mediaFile.mimetype.startsWith('video/');
      updateData.mediaType = isVideo ? 'video' : 'image';

      const uploadResponse = await uploadImage(
        mediaFile, 
        'ebs-closet/age-collections', 
        `age_${ageGroup.replace('-', '_')}`
      );
      updateData.mediaUrl = uploadResponse.url;
      updateData.mediaId = uploadResponse.fileId;
    }

    const updated = await AgeCollection.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData }, 
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error('Error updating age collection:', err);
    res.status(500).json({ message: 'Error updating age collection', error: err.message });
  }
});

// DELETE age collection
router.delete('/:id', async (req, res) => {
  try {
    const collection = await AgeCollection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: 'Age collection not found' });
    }

    if (collection.mediaId) {
      await deleteImage(collection.mediaId);
    }

    await AgeCollection.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting age collection' });
  }
});

module.exports = router;
