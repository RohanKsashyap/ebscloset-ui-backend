const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
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
  minStock: { type: Number, default: 5 }, // Minimum stock threshold for "few left" indicator
  featured: { type: Boolean, default: false },
  assured: { type: Boolean, default: false }, // Indicates if product is "Assured" quality
  variants: [{ 
    name: String, 
    price: Number, 
    inStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 } // Minimum stock threshold for variants
  }]
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
