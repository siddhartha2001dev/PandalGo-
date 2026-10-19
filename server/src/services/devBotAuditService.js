import { AuditLog } from '../models/AuditLog.js';

/**
 * Record an audit event for administrative actions
 */
export async function recordAuditEvent({ actorId, action, targetType = 'Puja', targetId = null, details = {}, ipAddress = '', userAgent = '' }) {
  try {
    return await AuditLog.create({
      actorId,
      action,
      targetType,
      targetId: targetId ? String(targetId) : null,
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err.message);
    return null;
  }
}
