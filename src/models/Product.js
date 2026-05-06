const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: Number, unique: true, sparse: true }, // Legacy numeric ID support
  name: { type: String, required: true },
  slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  description: { type: String, default: '' },
  category: { type: String, default: 'Uncategorized' }, // legacy string
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  image: { type: String, default: '' },
  imageId: { type: String, default: '' },  // ImageKit file ID for deletion
  thumbnailUrl: { type: String, default: '' }, // ImageKit thumbnail URL
  // Alternate/hover image
  hoverImage: { type: String, default: '' },
  hoverImageId: { type: String, default: '' },
  image3: { type: String, default: '' },
  image3Id: { type: String, default: '' },
  image4: { type: String, default: '' },
  image4Id: { type: String, default: '' },
  
  video: { type: String, default: '' },
  videoId: { type: String, default: '' },
  video2: { type: String, default: '' },
  video2Id: { type: String, default: '' },
  video3: { type: String, default: '' },
  video3Id: { type: String, default: '' },

  inStock: { type: Number, default: 0 },
  size: { type: String, default: '' }, // Legacy size information
  sizes: [{ type: String }], // Multiple size options (e.g., S, M, L, XL, 32, 34)
  color: { type: String, default: '' }, // Color information
  minStock: { type: Number, default: 5 }, // Minimum stock threshold for "few left" indicator
  newarrival: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  bestseller: { type: Boolean, default: false },
  assured: { type: Boolean, default: false },
  ageGroups: [{
    type: String,
    enum: ["0-1", "1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"]
  }],
  variants: [{ 
    name: String, 
    size: { type: String, default: '' },
    price: { type: Number, default: '' }, 
    inStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 } // Minimum stock threshold for variants
  }]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
