import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kalife-2026-secret-key-change-in-production';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Cross-tenant verification: Superadmins bypass workspace boundaries
    if (decoded.role === 'superadmin') {
      req.user = decoded;
      return next();
    }

    // Direct match: Token already scoped to active workspace
    if (decoded.organization_id === req.orgId) {
      req.user = decoded;
      return next();
    }

    // Account Owner Check: User is the creator of this organization/workspace
    if (req.orgInfo?.creator_email && decoded.email && req.orgInfo.creator_email.trim().toLowerCase() === decoded.email.trim().toLowerCase()) {
      req.user = {
        ...decoded,
        role: decoded.role === 'superadmin' ? 'superadmin' : 'admin',
        organization_id: req.orgId
      };
      return next();
    }

    // Multi-tenant Organization Membership Check: User assigned to this workspace in organization_users
    if (req.orgId && decoded.id) {
      const orgUserRes = await query(
        'SELECT role FROM organization_users WHERE organization_id = $1 AND user_id = $2',
        [req.orgId, decoded.id]
      );
      if (orgUserRes.rows.length > 0) {
        req.user = {
          ...decoded,
          role: orgUserRes.rows[0].role,
          organization_id: req.orgId
        };
        return next();
      }
    }

    return res.status(403).json({ error: 'Unauthorized: Access to this workspace is denied' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
}

export function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super-administrator privileges required' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden: Admin permissions are required' });
  }
  next();
}

export function requireScorekeeperOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'scorekeeper' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden: Scorekeeper or Admin permissions required' });
  }
  next();
}

export function requireMediaOrAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'media_manager' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Forbidden: Media Manager or Admin permissions required' });
  }
  next();
}

