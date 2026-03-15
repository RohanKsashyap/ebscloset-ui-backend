const mongoose = require('mongoose');

const siteSettingSchema = new mongoose.Schema({
  title: { type: String, default: "EB'S CLOSET" },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  address: { type: String, default: '' },
  hero: { type: Object, default: {} },
  editorial: { type: Object, default: {} },
  collections: { type: Array, default: [] },
  footerGroups: { type: Array, default: [] },
  social: { type: Array, default: [] },
  newsletter: { type: Object, default: {} },
  legalLabels: { type: Object, default: {} },
  infoPages: { type: Object, default: {} },
  budgets: { type: Array, default: [] },
  announcement: {
    text: { type: String, default: '' },
    show: { type: Boolean, default: false }
  },
  sparkleEffectEnabled: { type: Boolean, default: true }
}, { timestamps: true, strict: false });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
