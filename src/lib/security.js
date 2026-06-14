import crypto from 'node:crypto';

export function createOpaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function addMinutes(minutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}
