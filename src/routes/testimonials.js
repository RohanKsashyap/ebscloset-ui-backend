const { Router } = require('express');
const os = require('os');
const testimonialController = require('../controllers/testimonialController');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// Public routes
router.get('/', testimonialController.getPublicTestimonials);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, testimonialController.getAllTestimonials);
router.post('/admin/add', adminAuth, testimonialController.addTestimonial);
router.put('/admin/:id', adminAuth, testimonialController.updateTestimonial);
router.delete('/admin/:id', adminAuth, testimonialController.deleteTestimonial);

module.exports = router;
