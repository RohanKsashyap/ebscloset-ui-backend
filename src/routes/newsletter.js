const { Router } = require('express');
const Subscriber = require('../models/Subscriber');

const router = Router();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if already subscribed
    let subscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    
    if (subscriber) {
      if (subscriber.isActive) {
        return res.status(200).json({ success: true, message: 'You are already subscribed!' });
      } else {
        subscriber.isActive = true;
        await subscriber.save();
        return res.status(200).json({ success: true, message: 'Welcome back! Your subscription is active again.' });
      }
    }

    // Create new subscriber
    await Subscriber.create({ email: email.toLowerCase() });
    res.status(201).json({ success: true, message: 'Subscribed successfully! Thank you for joining our newsletter.' });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ success: false, message: 'Error processing subscription' });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });
    if (!subscriber) {
      return res.status(404).json({ success: false, message: 'Subscriber not found' });
    }

    subscriber.isActive = false;
    await subscriber.save();

    res.json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (err) {
    console.error('Newsletter unsubscription error:', err);
    res.status(500).json({ success: false, message: 'Error processing unsubscription' });
  }
});

module.exports = router;
