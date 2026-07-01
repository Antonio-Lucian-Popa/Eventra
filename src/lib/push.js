import { prisma } from './prisma.js';
import { config } from './env.js';

// Trimite un batch de notificari push prin Expo Push API.
// Daca push-ul nu e activat (EXPO_PUSH_ENABLED != true) sau nu exista token-uri,
// functia intoarce fara sa arunce, ca sa nu blocheze fluxul de business.
export async function sendPushToTokens(tokens, { title, body, data }) {
  const clean = [...new Set((tokens || []).filter(Boolean))];
  if (!clean.length) return { sent: 0, skipped: true };
  if (!config.push.enabled) {
    console.info(`[push] dezactivat - ar fi trimis "${title}" catre ${clean.length} device(uri).`);
    return { sent: 0, skipped: true };
  }

  const messages = clean.map((to) => ({ to, sound: 'default', title, body, data: data || {} }));
  const headers = { 'Content-Type': 'application/json' };
  if (config.push.accessToken) headers.Authorization = `Bearer ${config.push.accessToken}`;

  const res = await fetch(config.push.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Expo push a esuat (${res.status}): ${detail}`);
  }
  return { sent: clean.length, skipped: false };
}

// Trimite push catre toti lucratorii (dupa userId), pe toate device-urile lor.
export async function sendPushToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return { sent: 0, skipped: true };
  const devices = await prisma.deviceToken.findMany({
    where: { userId: { in: ids } },
    select: { token: true },
  });
  return sendPushToTokens(devices.map((d) => d.token), payload);
}
