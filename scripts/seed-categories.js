const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Category = require('../src/models/Category');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const categories = [
  {
    name: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'Fresh styles just for you',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'By Age',
    slug: 'by-age',
    description: 'Perfect fit for every age group',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Occasions',
    slug: 'occasions',
    description: 'Dresses for every special moment',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Styles',
    slug: 'styles',
    description: 'Find your unique fashion statement',
    displayOrder: 4,
    isActive: true,
  }
];

const seedCategories = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    for (const catData of categories) {
      const existing = await Category.findOne({ slug: catData.slug });
      if (!existing) {
        await Category.create(catData);
        console.log(`Created category: ${catData.name}`);
      } else {
        console.log(`Category already exists: ${catData.name}`);
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding categories:', err);
    process.exit(1);
  }
};

seedCategories();
