// server.ts
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from backend .env explicitly
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const productRoutes = require('./routes/products');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const galleryRoutes = require('./routes/gallery');
const offerRoutes = require('./routes/offers');
const contactRoutes = require('./routes/contact');
const reviewRoutes = require('./routes/reviews');
const testimonialRoutes = require('./routes/testimonials');
const galleryOfferRoutes = require('./routes/galleryOffers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  'https://www.arlenandco.com.au',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true 
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
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/gallery-offers', galleryOfferRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error', error: err.message });
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
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });





  