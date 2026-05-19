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
  brand: { type: String, default: '' },
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
  colors: [{ type: String }], // Multiple color options
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
    sku: { type: String, required: true },
    attributes: {
      size: { type: String },
      color: { type: String }
    },
    price: { type: Number, required: true },
    stock: {
      quantity: { type: Number, default: 0 },
      minStock: { type: Number, default: 5 }
    },
    images: [String],
    // Keeping some old fields inside variants for partial compatibility if needed
    name: String, 
    inStock: { type: Number, default: 0 } // Mapping to stock.quantity
  }]
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.inStock = this.variants.reduce((total, variant) => {
      const qty = variant.stock?.quantity ?? variant.inStock ?? 0;
      return total + Number(qty);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
