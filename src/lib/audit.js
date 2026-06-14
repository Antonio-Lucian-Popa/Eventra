import { prisma } from './prisma.js';

export async function audit(req, { action, entity, entityId, metadata }) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: req.user?.organizationId,
        userId: req.user?.id,
        action,
        entity,
        entityId,
        metadata,
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Audit log failed', error);
  }
}
