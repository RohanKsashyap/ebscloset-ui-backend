const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Category = require('../src/models/Category');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ─── Head (top-level) categories from the nav bar ────────────────────────────
const headCategories = [
  {
    name: "New | Summer '26",
    slug: 'new-summer-26',
    description: 'Fresh new arrivals for Summer 2026',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Baby',
    slug: 'baby',
    description: 'Adorable styles for your little one',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Girls',
    slug: 'girls',
    description: 'Beautiful dresses and outfits for girls',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Boys',
    slug: 'boys',
    description: 'Smart and casual wear for boys',
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'SALE',
    slug: 'sale',
    description: 'Great deals and discounts',
    displayOrder: 5,
    isActive: true,
  },
  {
    name: 'Party & Formal',
    slug: 'party-formal',
    description: 'Elegant outfits for special occasions',
    displayOrder: 6,
    isActive: true,
  },
  {
    name: 'Collections',
    slug: 'collections',
    description: 'Curated seasonal collections',
    displayOrder: 7,
    isActive: true,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Complete the look with the perfect accessories',
    displayOrder: 8,
    isActive: true,
  },
  {
    name: 'eGift Card',
    slug: 'egift-card',
    description: 'Give the gift of choice',
    displayOrder: 9,
    isActive: true,
  },
  {
    name: 'Stores',
    slug: 'stores',
    description: 'Find a store near you',
    displayOrder: 10,
    isActive: true,
  },
];

const seedCategories = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const catData of headCategories) {
      const existing = await Category.findOne({ slug: catData.slug });
      if (!existing) {
        await Category.create({ ...catData, parentCategory: null });
        console.log(`  ✚ Created: ${catData.name}`);
        created++;
      } else {
        console.log(`  — Already exists: ${catData.name}`);
        skipped++;
      }
    }

    console.log(`\n🎉 Done — ${created} created, ${skipped} already existed.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding categories:', err);
    process.exit(1);
  }
};

seedCategories();
