const { Router } = require('express');
const reviewController = require('../controllers/reviewController');
const adminAuth = require('../middleware/adminAuth');
const { reviewLimiter } = require('../middleware/rateLimiter');

const router = Router();

// Public routes
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/product/:productId/rating', reviewController.getProductRating);
router.post('/verify-eligibility', reviewLimiter, reviewController.verifyEligibility);
router.post('/submit', reviewLimiter, reviewController.submitReview);

// Admin routes (Protected)
router.get('/admin/all', adminAuth, reviewController.getAllReviews);
router.put('/admin/:id', adminAuth, reviewController.updateReview);
router.delete('/admin/:id', adminAuth, reviewController.deleteReview);
router.post('/admin/add', adminAuth, reviewController.addAdminReview);

module.exports = router;
