const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const Category = require('../src/models/Category');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ─── Helper ──────────────────────────────────────────────────────────────────
const makeSlug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// ─── Data ────────────────────────────────────────────────────────────────────
// Four column-groups visible in the Baby mega-dropdown
const groups = [
  {
    name: 'Baby Boy (Prem-24M)',
    slug: 'baby-boy-prem-24m',
    description: 'Clothing for baby boys from premature to 24 months',
    displayOrder: 1,
    items: [
      'New In',
      'Shop All',
      'Rompers',
      'Bodysuits',
      'Overalls & Sets',
      'Tops',
      'Sweaters & Hoodies',
      'Bottoms',
      'Jackets & Coats',
      'Knitwear',
      'Sleepwear',
      'Swimwear',
    ],
  },
  {
    name: 'Baby Girl (Prem-24M)',
    slug: 'baby-girl-prem-24m',
    description: 'Clothing for baby girls from premature to 24 months',
    displayOrder: 2,
    items: [
      'New In',
      'Shop All',
      'Rompers',
      'Bodysuits',
      'Dresses',
      'Overalls & Sets',
      'Tops',
      'Sweaters & Hoodies',
      'Bottoms',
      'Jackets & Coats',
      'Knitwear',
      'Sleepwear',
    ],
  },
  {
    name: 'Baby Neutral (Prem-24M)',
    slug: 'baby-neutral-prem-24m',
    description: 'Gender-neutral baby clothing from premature to 24 months',
    displayOrder: 3,
    items: [
      'New In',
      'Shop All',
      'Rompers',
      'Bodysuits',
      'Overalls & Sets',
      'Tops',
      'Bottoms',
      'Jackets & Coats',
      'Knitwear',
      'Accessories & Toys',
    ],
  },
  {
    name: 'Shop by Age',
    slug: 'baby-shop-by-age',
    description: 'Browse baby clothing by age range',
    displayOrder: 4,
    items: [
      'Prem',
      'New Born',
      '0-3m',
      '3-6m',
      '6-12m',
      '12-18m',
      '18-24m',
      'One Size For All',
    ],
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Resolve Baby parent
    const baby = await Category.findOne({ slug: 'baby' });
    if (!baby) throw new Error('Baby category not found — run seed-categories.js first');
    console.log(`👶 Baby _id: ${baby._id}\n`);

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const group of groups) {
      // 2. Create or find the group-level subcategory (child of Baby)
      let groupCat = await Category.findOne({ slug: group.slug });
      if (!groupCat) {
        groupCat = await Category.create({
          name: group.name,
          slug: group.slug,
          description: group.description,
          displayOrder: group.displayOrder,
          parentCategory: baby._id,
          isActive: true,
        });
        console.log(`  ✚ Group created:  ${group.name}`);
        totalCreated++;
      } else {
        console.log(`  — Group exists:   ${group.name}`);
        totalSkipped++;
      }

      // 3. Create each item as a sub-subcategory (child of the group)
      for (let i = 0; i < group.items.length; i++) {
        const itemName = group.items[i];
        // Make slug unique by prefixing with group slug
        const itemSlug = `${group.slug}-${makeSlug(itemName)}`;

        const existing = await Category.findOne({ slug: itemSlug });
        if (!existing) {
          await Category.create({
            name: itemName,
            slug: itemSlug,
            displayOrder: i + 1,
            parentCategory: groupCat._id,
            isActive: true,
          });
          console.log(`      ✚ Item created: ${itemName}`);
          totalCreated++;
        } else {
          console.log(`      — Item exists:  ${itemName}`);
          totalSkipped++;
        }
      }
      console.log('');
    }

    console.log(`🎉 Done — ${totalCreated} created, ${totalSkipped} already existed.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

seed();
