const Testimonial = require('../models/Testimonial');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

// Helper to get first file if it's an array
const getFirstFile = (file) => {
  if (Array.isArray(file)) return file[0];
  return file;
};

// Get all testimonials (Admin)
exports.getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching testimonials', error: err.message });
  }
};

// Get public testimonials (Visible only)
exports.getPublicTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ status: 'visible' }).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching public testimonials', error: err.message });
  }
};

// Add new testimonial
exports.addTestimonial = async (req, res) => {
  try {
    console.log('Add Testimonial Request:', {
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'none'
    });

    const { customerName, tag, product, rating, content, status } = req.body;
    
    let testimonialData = {
      customerName,
      tag,
      product,
      rating: parseInt(rating) || 5,
      content,
      status: status || 'visible'
    };

    // Handle avatar upload if provided
    if (req.files && req.files.avatar) {
      const file = getFirstFile(req.files.avatar);
      console.log('Uploading testimonial avatar:', file.name);
      const uploadResponse = await uploadImage(file, 'ebs-closet/testimonials', 'avatar');
      testimonialData.avatarUrl = uploadResponse.url;
      testimonialData.avatarId = uploadResponse.fileId;
    }

    const testimonial = await Testimonial.create(testimonialData);
    res.status(201).json(testimonial);
  } catch (err) {
    console.error('Error adding testimonial:', err);
    res.status(500).json({ message: 'Error adding testimonial', error: err.message });
  }
};

// Update testimonial
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Update Testimonial Request:', {
      id,
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'none'
    });

    const { customerName, tag, product, rating, content, status } = req.body;
    
    let updateData = {};
    if (customerName !== undefined) updateData.customerName = customerName;
    if (tag !== undefined) updateData.tag = tag;
    if (product !== undefined) updateData.product = product;
    if (rating !== undefined) updateData.rating = parseInt(rating) || 5;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;

    // Handle new avatar upload if provided
    if (req.files && req.files.avatar) {
      const file = getFirstFile(req.files.avatar);
      console.log('Updating testimonial avatar:', file.name);

      // Delete old avatar if exists
      const existing = await Testimonial.findById(id);
      if (existing && existing.avatarId) {
        try {
          await deleteImage(existing.avatarId);
        } catch (err) {
          console.warn('Failed to delete old avatar:', err.message);
        }
      }

      const uploadResponse = await uploadImage(file, 'ebs-closet/testimonials', 'avatar');
      updateData.avatarUrl = uploadResponse.url;
      updateData.avatarId = uploadResponse.fileId;
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );

    if (!updatedTestimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    
    res.json(updatedTestimonial);
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.status(500).json({ message: 'Error updating testimonial', error: err.message });
  }
};

// Delete testimonial
exports.deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id);
    
    if (!testimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }

    // Delete avatar from ImageKit if exists
    if (testimonial.avatarId) {
      await deleteImage(testimonial.avatarId);
    }

    await Testimonial.findByIdAndDelete(id);
    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting testimonial', error: err.message });
  }
};
