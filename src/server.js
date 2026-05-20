// server.ts
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');

// Load environment variables from backend .env explicitly
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const galleryRoutes = require('./routes/gallery');
const offerRoutes = require('./routes/offers');
const contactRoutes = require('./routes/contact');
const reviewRoutes = require('./routes/reviews');
const testimonialRoutes = require('./routes/testimonials');
const galleryOfferRoutes = require('./routes/galleryOffers');
const siteRoutes = require('./routes/site');
const discountRoutes = require('./routes/discounts');
const newsletterRoutes = require('./routes/newsletter');
const sitemapRoutes = require('./routes/sitemap');
const ageCollectionRoutes = require('./routes/ageCollections');
const blogRoutes = require('./routes/blogs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'https://www.ebscloset.com.au',
  'https://ebscloset-ui.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true 
}));

// Stripe webhook needs raw body
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global middleware for file uploads
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  useTempFiles: true,
  tempFileDir: os.tmpdir()
}));

// Security and compression
try {
  const compression = require('compression');
  app.use(compression());
} catch (e) {
  console.warn('compression not installed; skipping');
}
try {
  const helmet = require('helmet');
  app.use(helmet({ contentSecurityPolicy: false }));
} catch (e) {
  console.warn('helmet not installed; skipping');
}

// API cache headers: default no-store for dynamic data
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/gallery-offers', galleryOfferRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/age-collections', ageCollectionRoutes);
app.use('/api/blogs', blogRoutes);

// Dynamic Sitemap at root
app.use('/sitemap.xml', sitemapRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({ 
    message: status === 500 ? 'Internal server error' : err.message, 
    error: err.message 
  });
});

// Static file caching for frontend build (if served by backend)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path && !req.path.startsWith('/api')) {
    // Header defaults for static assets
    res.setHeader('Vary', 'Accept-Encoding');
  }
  next();
});
app.use(express.static(frontendDist, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (/\.(css|js|png|jpe?g|webp|avif|svg|ico|woff2?)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  },
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Check for Mongo URI
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env');
  process.exit(1);
}

// Connect to MongoDB and start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`✅ MongoDB connected successfully: ${process.env.MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });





  
