const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, service, message } = req.body || {};

    // Basic validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    const allowedSubjects = ['general', 'order', 'product', 'wholesale', 'feedback', 'service'];
    if (!subject || !allowedSubjects.includes(String(subject).toLowerCase())) {
      return res.status(400).json({ message: 'Invalid subject' });
    }
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters' });
    }

    const doc = await Contact.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      subject: String(subject).toLowerCase(),
      service: service ? String(service).trim() : undefined,
      message: String(message).trim()
    });

    return res.status(201).json({ id: doc._id, createdAt: doc.createdAt });
  } catch (err) {
    console.error('Contact submission error:', err);
    return res.status(500).json({ message: 'Failed to submit contact message' });
  }
});

module.exports = router;