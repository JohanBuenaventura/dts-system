// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';

// ─── PROTECT ─────────────────────────────────────────────────────────────────
// Attach this to any route that requires authentication.
// It validates the Bearer token and injects req.user for downstream handlers.
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, department, full_name }

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// ─── AUTHORIZE (Role Guard) ───────────────────────────────────────────────────
// Usage: authorize('Admin') — only Admins can proceed
// Usage: authorize('Admin', 'Staff') — both roles allowed
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};