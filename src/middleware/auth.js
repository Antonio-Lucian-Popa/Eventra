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

// Rolurile cerute de client se mapeaza peste rolurile deja existente:
//   `sales`  (Vanzari)  = nivel `manager` (operational + vanzari)
//   `worker` (Lucrator) = nivel `staff`   (executie + task-uri + push)
// Astfel orice ruta care permite `manager` permite si `sales`, iar orice ruta
// care permite `staff` permite si `worker`, fara a atinge fiecare modul.
const ROLE_ALIASES = {
  manager: ['sales'],
  staff: ['worker'],
};

function expandRoles(roles) {
  const allowed = new Set(roles);
  for (const role of roles) {
    for (const alias of ROLE_ALIASES[role] || []) allowed.add(alias);
  }
  return allowed;
}

export function requireRoles(...roles) {
  const allowed = expandRoles(roles);
  return (req, res, next) => {
    if (!req.user || !allowed.has(req.user.role)) {
      throw new ApiError(403, 'forbidden', 'Nu ai permisiunea necesara.');
    }
    next();
  };
}
