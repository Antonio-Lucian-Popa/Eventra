import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { ApiError, asyncHandler, sendCreated } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { addDays, addMinutes, createOpaqueToken, hashToken } from '../../lib/security.js';
import { audit } from '../../lib/audit.js';
import { sendInvitationEmail, sendPasswordResetEmail } from '../../lib/mailer.js';

const router = Router();
const publicUser = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  organization: { select: { id: true, name: true, slug: true } },
};

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  role: z.enum(['admin', 'manager', 'staff', 'sales', 'worker']).default('staff'),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });
const resetRequestSchema = z.object({ email: z.string().email().toLowerCase() });
const resetConfirmSchema = z.object({ token: z.string().min(20), password: z.string().min(8) });
const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'manager', 'staff', 'sales', 'worker']).default('staff'),
});
const acceptInviteSchema = z.object({
  token: z.string().min(20),
  name: z.string().min(2),
  password: z.string().min(8),
});

function sign(user) {
  return jwt.sign({ role: user.role }, config.jwt.secret, { subject: user.id, expiresIn: config.jwt.expiresIn });
}

async function issueRefreshToken(userId) {
  const token = createOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: addDays(config.jwt.refreshTokenDays),
    },
  });
  return token;
}

router.post(
  '/register',
  requireAuth,
  requireRoles('admin'),
  validate({ body: registerSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const { password, ...body } = req.validated.body;
    const user = await prisma.user.create({
      data: { ...body, organizationId: req.user.organizationId, passwordHash: await bcrypt.hash(password, 12) },
      select: publicUser,
    });
    await audit(req, { action: 'create_user', entity: 'user', entityId: user.id, metadata: { role: user.role, email: user.email } });
    sendCreated(res, { user });
  }),
);

router.post(
  '/login',
  validate({ body: loginSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.validated.body.email }, include: { organization: true } });
    if (!user || user.deletedAt || !(await bcrypt.compare(req.validated.body.password, user.passwordHash))) {
      throw new ApiError(401, 'invalid_credentials', 'Email sau parola invalida.');
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ data: { token: sign(user), refreshToken: await issueRefreshToken(user.id), user: safeUser } });
  }),
);

router.post(
  '/refresh',
  validate({ body: refreshSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const tokenHash = hashToken(req.validated.body.refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: { include: { organization: true } } } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
      throw new ApiError(401, 'invalid_refresh_token', 'Refresh token invalid sau expirat.');
    }
    const newRefreshToken = createOpaqueToken();
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByHash: hashToken(newRefreshToken) },
    });
    await prisma.refreshToken.create({
      data: { userId: stored.userId, tokenHash: hashToken(newRefreshToken), expiresAt: addDays(config.jwt.refreshTokenDays) },
    });
    const { passwordHash, ...safeUser } = stored.user;
    res.json({ data: { token: sign(stored.user), refreshToken: newRefreshToken, user: safeUser } });
  }),
);

router.post(
  '/logout',
  validate({ body: refreshSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(req.validated.body.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
  }),
);

router.post(
  '/password-reset/request',
  validate({ body: resetRequestSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.validated.body.email } });
    if (!user || user.deletedAt) return res.json({ data: { sent: true } });
    const token = createOpaqueToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: addMinutes(config.jwt.passwordResetMinutes) },
    });
    const mail = await sendPasswordResetEmail({ to: user.email, token });
    res.json({ data: { sent: true, emailSent: mail.sent, resetToken: config.isProd || mail.sent ? undefined : token } });
  }),
);

router.post(
  '/password-reset/confirm',
  validate({ body: resetConfirmSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(req.validated.body.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new ApiError(400, 'invalid_reset_token', 'Token reset invalid sau expirat.');
    }
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(req.validated.body.password, 12) } });
      await tx.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      await tx.refreshToken.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    res.json({ data: { changed: true } });
  }),
);

router.post(
  '/invitations',
  requireAuth,
  requireRoles('admin', 'manager'),
  validate({ body: inviteSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const token = createOpaqueToken();
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: req.user.organizationId,
        invitedById: req.user.id,
        email: req.validated.body.email,
        role: req.validated.body.role,
        tokenHash: hashToken(token),
        expiresAt: addDays(config.jwt.invitationDays),
      },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });
    const mail = await sendInvitationEmail({ to: invitation.email, token, role: invitation.role });
    await audit(req, { action: 'invite_user', entity: 'invitation', entityId: invitation.id, metadata: { email: invitation.email, role: invitation.role } });
    sendCreated(res, { invitation, emailSent: mail.sent, invitationToken: config.isProd || mail.sent ? undefined : token });
  }),
);

router.post(
  '/invitations/accept',
  validate({ body: acceptInviteSchema, params: z.object({}), query: z.object({}) }),
  asyncHandler(async (req, res) => {
    const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(req.validated.body.token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new ApiError(400, 'invalid_invitation', 'Invitatie invalida sau expirata.');
    }
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          name: req.validated.body.name,
          email: invitation.email,
          role: invitation.role,
          passwordHash: await bcrypt.hash(req.validated.body.password, 12),
        },
        select: publicUser,
      });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return created;
    });
    sendCreated(res, { user, token: sign(user), refreshToken: await issueRefreshToken(user.id) });
  }),
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ data: req.user });
});

export default router;
