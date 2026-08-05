import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Cross-tenant verification: Ensure user belongs to the active organization requested
    if (decoded.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Unauthorized: Access to this workspace is denied' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin permissions are required' });
  }
  next();
}

export function requireScorekeeperOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'scorekeeper')) {
    return res.status(403).json({ error: 'Forbidden: Scorekeeper or Admin permissions required' });
  }
  next();
}
