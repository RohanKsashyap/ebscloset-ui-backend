const { Router } = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const baseUrl = 'https://www.ebscloset.com.au';
    
    // Fetch products and categories
    const [products, categories] = await Promise.all([
      Product.find({}, 'id _id updatedAt'),
      Category.find({ isActive: true }, 'slug updatedAt')
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/shop', priority: '0.9', changefreq: 'daily' },
      { url: '/our-story', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq', priority: '0.6', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic Categories
    categories.forEach(cat => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/shop?category=${cat.slug}</loc>\n`;
      xml += `    <lastmod>${(cat.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic Products
    products.forEach(prod => {
      const productId = prod.id || prod._id;
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/product/${productId}</loc>\n`;
      xml += `    <lastmod>${(prod.updatedAt || new Date()).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).end();
  }
});

module.exports = router;
