const { Router } = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const User = require('../models/User');
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/auth');

// Configure SendGrid (requires SENDGRID_API_KEY in environment)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not set. Password reset emails will fail.');
}

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      password,
      fullName,
      role: 'user' // Default to user role
    });

    await user.save();

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/admin-login
// @desc    Authenticate admin & get token
// @access  Public
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized as admin' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    console.error('Get user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/admin-me
// @desc    Get current admin user
// @access  Admin
router.get('/admin-me', adminAuth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    console.error('Get admin user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset for admin account (email with token)
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim(), role: 'admin' });

    // For security, always return success even if user not found
    if (!user) {
      return res.json({ message: 'If an account exists for this email, a reset link has been sent' });
    }

    // Generate token and set expiry (15 minutes by default)
    const token = crypto.randomBytes(32).toString('hex');
    const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES || 15);
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await user.save();

    const frontendBase = process.env.ADMIN_RESET_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const resetUrl = `${frontendBase.replace(/\/$/, '')}/admin/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Compose email (use verified sender)
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM;
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;
    if (!fromEmail) {
      console.warn('No verified sender configured. Set SENDGRID_FROM_EMAIL or EMAIL_FROM in .env');
    }
    const msg = {
      to: user.email,
      from: fromEmail,
      replyTo,
      subject: 'Reset your Arlen & Co admin password',
      text: `You requested a password reset. Use the link below to set a new password.\n\n${resetUrl}\n\nThis link expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.`,
      html: `<p>You requested a password reset for your <strong>Arlen & Co</strong> admin account.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a></p>
             <p>This link expires in <strong>${ttlMinutes} minutes</strong>. If you did not request this, you can ignore this email.</p>`
    };

    try {
      await sgMail.send(msg);
    } catch (e) {
      console.error('SendGrid error:', e?.response?.body || e.message || e);
      // Dev fallback: log the reset URL to console for testing
      if (process.env.NODE_ENV !== 'production') {
        console.log(`DEV PASSWORD RESET URL: ${resetUrl}`);
      }
      // Even if email fails, respond generically (avoid leaking accounts)
    }

    // In non-production, also log the reset link for convenience
    if (process.env.NODE_ENV !== 'production') {
      console.log(`DEV PASSWORD RESET URL: ${resetUrl}`);
    }

    return res.json({ message: 'If an account exists for this email, a reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and newPassword are required' });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim(), role: 'admin' });
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (user.resetPasswordToken !== token) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    if (user.resetPasswordExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update password and clear reset fields
    user.password = String(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName) user.fullName = fullName;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }
    if (phone) user.phone = phone;

    await user.save();
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/password
// @desc    Update user password
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/addresses
// @desc    Get user saved addresses
// @access  Private
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.addresses || []);
  } catch (err) {
    console.error('Get addresses error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/addresses
// @desc    Add new address
// @access  Private
router.post('/addresses', auth, async (req, res) => {
  try {
    const { type, fullName, address, city, postalCode, country, phone, isPrimary } = req.body;
    const user = await User.findById(req.user.id);

    if (isPrimary) {
      user.addresses.forEach(addr => addr.isPrimary = false);
    }

    const newAddress = {
      type: type || 'Home',
      fullName,
      address,
      city,
      postalCode,
      country,
      phone,
      isPrimary: isPrimary || user.addresses.length === 0
    };

    user.addresses.push(newAddress);
    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) {
    console.error('Add address error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/addresses/:id
// @desc    Update address
// @access  Private
router.put('/addresses/:id', auth, async (req, res) => {
  try {
    const { type, fullName, address, city, postalCode, country, phone, isPrimary } = req.body;
    const user = await User.findById(req.user.id);
    const addressIdx = user.addresses.findIndex(addr => addr._id.toString() === req.params.id);

    if (addressIdx === -1) return res.status(404).json({ message: 'Address not found' });

    if (isPrimary) {
      user.addresses.forEach(addr => addr.isPrimary = false);
    }

    user.addresses[addressIdx] = {
      ...user.addresses[addressIdx],
      type: type || user.addresses[addressIdx].type,
      fullName: fullName || user.addresses[addressIdx].fullName,
      address: address || user.addresses[addressIdx].address,
      city: city || user.addresses[addressIdx].city,
      postalCode: postalCode || user.addresses[addressIdx].postalCode,
      country: country || user.addresses[addressIdx].country,
      phone: phone || user.addresses[addressIdx].phone,
      isPrimary: isPrimary !== undefined ? isPrimary : user.addresses[addressIdx].isPrimary
    };

    await user.save();
    res.json(user.addresses);
  } catch (err) {
    console.error('Update address error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/auth/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== req.params.id);
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    console.error('Delete address error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;