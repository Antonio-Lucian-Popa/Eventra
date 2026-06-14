import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler } from '../lib/http.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'unauthorized', 'Token lipsa.');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user || user.deletedAt) throw new Error('missing user');
    req.user = user;
    next();
  } catch {
    throw new ApiError(401, 'unauthorized', 'Token invalid sau expirat.');
  }
});

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, 'forbidden', 'Nu ai permisiunea necesara.');
    }
    next();
  };
}
