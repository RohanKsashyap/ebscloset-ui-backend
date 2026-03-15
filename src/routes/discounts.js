const { Router } = require('express');
const DiscountCode = require('../models/DiscountCode');
const router = Router();

// Validate a discount code
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const discount = await DiscountCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true
    });

    if (!discount) {
      return res.status(404).json({ message: 'Invalid or inactive discount code' });
    }

    // Check expiry
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Discount code has expired' });
    }

    // Check max uses
    if (discount.maxUses !== null && discount.usageCount >= discount.maxUses) {
      return res.status(400).json({ message: 'Discount code usage limit reached' });
    }

    res.json({ code: discount });
  } catch (err) {
    res.status(500).json({ message: 'Error validating discount code' });
  }
});

module.exports = router;
