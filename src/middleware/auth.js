const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
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
    
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
