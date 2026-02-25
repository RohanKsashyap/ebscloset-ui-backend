const { Router } = require('express');
const fileUpload = require('express-fileupload');
const testimonialController = require('../controllers/testimonialController');
const adminAuth = require('../middleware/adminAuth');

const router = Router();

// Middleware for file uploads
router.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Public routes
router.get('/', testimonialController.getPublicTestimonials);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, testimonialController.getAllTestimonials);
router.post('/admin/add', adminAuth, testimonialController.addTestimonial);
router.put('/admin/:id', adminAuth, testimonialController.updateTestimonial);
router.delete('/admin/:id', adminAuth, testimonialController.deleteTestimonial);

module.exports = router;
