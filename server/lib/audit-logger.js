import { query } from '../db.js';

/**
 * Log a superadmin administrative action into superadmin_audit_logs table.
 *
 * @param {Object} params
 * @param {number|null} params.userId - Superadmin user ID performing the action
 * @param {string} params.action - e.g. 'WORKSPACE_APPROVE', 'USER_ROLE_CHANGE', 'LICENSE_EXTEND'
 * @param {string} params.targetType - 'organization', 'user', 'setting', 'system'
 * @param {string|number|null} params.targetId - ID or key of target entity
 * @param {Object} [params.details={}] - Additional metadata or payload
 * @param {string} [params.ipAddress=''] - Client IP address
 */
export async function logSuperadminAction({ userId, action, targetType, targetId, details = {}, ipAddress = '' }) {
  try {
    await query(
      `INSERT INTO superadmin_audit_logs (user_id, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        userId || null,
        action,
        targetType,
        targetId !== undefined && targetId !== null ? String(targetId) : null,
        JSON.stringify(details),
        ipAddress || ''
      ]
    );
  } catch (err) {
    // Non-blocking error: log to console so main request succeeds
    console.error('Failed to write superadmin audit log:', err.message);
  }
}
