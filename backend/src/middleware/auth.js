const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gym-tracking-secret-key-dev-only';

const signToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak tersedia.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token tidak valid atau telah kedaluwarsa' });
  }
};

module.exports = { authenticate, signToken };
