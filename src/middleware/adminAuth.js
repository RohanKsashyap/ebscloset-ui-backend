const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    let token;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.header('x-auth-token');
    }
    
    // Check if no token
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.user.id).select('-password');
    
    // Check if user exists and is an admin
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to access admin resources' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Admin Auth middleware error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = adminAuth;
