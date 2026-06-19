const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforrentiqschoolproject123';

const authenticateToken = (req, res, next) => {
  
  let token = req.cookies?.token || req.headers['authorization'];
  
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role. Access denied.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
