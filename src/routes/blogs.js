const { Router } = require('express');
const blogController = require('../controllers/blogController');
const router = Router();

router.get('/', blogController.getBlogs);
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;
