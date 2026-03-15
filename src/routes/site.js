const { Router } = require('express');
const SiteSetting = require('../models/SiteSetting');
const Navigation = require('../models/Navigation');

const router = Router();

// Get site settings
router.get('/site-settings', async (req, res) => {
  try {
    let settings = await SiteSetting.findOne();
    if (!settings) {
      settings = await SiteSetting.create({});
    }
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching site settings' });
  }
});

// Get navigation
router.get('/navigation', async (req, res) => {
  try {
    const navItems = await Navigation.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json({ data: navItems });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching navigation' });
  }
});

module.exports = router;
