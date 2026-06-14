import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

function transporter() {
  if (!config.smtp.enabled) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: Number(config.smtp.port) === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

export async function sendMail({ to, subject, text, html }) {
  const tx = transporter();
  if (!tx) return { sent: false };
  await tx.sendMail({ from: config.smtp.from, to, subject, text, html });
  return { sent: true };
}

export async function sendInvitationEmail({ to, token, role }) {
  const url = `${config.appUrl}/login?invitation=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: 'Invitație EventPro',
    text: `Ai fost invitat în EventPro cu rolul ${role}. Acceptă invitația: ${url}`,
    html: `<p>Ai fost invitat în EventPro cu rolul <strong>${role}</strong>.</p><p><a href="${url}">Acceptă invitația</a></p>`,
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const url = `${config.appUrl}/login?reset=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: 'Resetare parolă EventPro',
    text: `Resetează parola EventPro: ${url}`,
    html: `<p>Ai cerut resetarea parolei EventPro.</p><p><a href="${url}">Resetează parola</a></p>`,
  });
}
