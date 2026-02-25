const Testimonial = require('../models/Testimonial');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

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
    const { customerName, tag, product, rating, content, status } = req.body;
    
    let testimonialData = {
      customerName,
      tag,
      product,
      rating: parseInt(rating),
      content,
      status: status || 'visible'
    };

    // Handle avatar upload if provided
    if (req.files && req.files.avatar) {
      const file = req.files.avatar;
      const uploadResponse = await uploadImage(file, 'arlenco/testimonials', 'avatar');
      testimonialData.avatarUrl = uploadResponse.url;
      testimonialData.avatarId = uploadResponse.fileId; // We store fileId for deletion
    }

    const testimonial = await Testimonial.create(testimonialData);
    res.status(201).json(testimonial);
  } catch (err) {
    res.status(500).json({ message: 'Error adding testimonial', error: err.message });
  }
};

// Update testimonial
exports.updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, tag, product, rating, content, status } = req.body;
    
    let updateData = {
      customerName,
      tag,
      product,
      rating: parseInt(rating),
      content,
      status
    };

    // Handle new avatar upload if provided
    if (req.files && req.files.avatar) {
      // Delete old avatar if exists
      const existing = await Testimonial.findById(id);
      if (existing && existing.avatarId) {
        await deleteImage(existing.avatarId);
      }

      const file = req.files.avatar;
      const uploadResponse = await uploadImage(file, 'arlenco/testimonials', 'avatar');
      updateData.avatarUrl = uploadResponse.url;
      updateData.avatarId = uploadResponse.fileId;
    }

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedTestimonial) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    
    res.json(updatedTestimonial);
  } catch (err) {
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
