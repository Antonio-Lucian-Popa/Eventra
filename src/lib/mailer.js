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

export async function sendPreconfirmationEmail({ to, clientName, eventTitle, venueName, eventDate, expiresAt }) {
  const eventDateStr = eventDate ? new Date(eventDate).toLocaleDateString('ro-RO') : '';
  const expiresStr = expiresAt ? new Date(expiresAt).toLocaleString('ro-RO') : '';
  const venueLine = venueName ? ` la <strong>${venueName}</strong>` : '';
  return sendMail({
    to,
    subject: `Preconfirmare rezervare - ${eventTitle}`,
    text:
      `Buna, ${clientName || ''}.\n\n` +
      `Am rezervat provizoriu locul pentru evenimentul "${eventTitle}"${venueName ? ` la ${venueName}` : ''}` +
      `${eventDateStr ? ` din data de ${eventDateStr}` : ''}.\n` +
      `Te asteptam la locatie pentru a confirma rezervarea pana la ${expiresStr}. ` +
      `Dupa acest termen locul poate fi realocat.\n`,
    html:
      `<p>Buna, ${clientName || ''}.</p>` +
      `<p>Am rezervat provizoriu locul pentru evenimentul <strong>${eventTitle}</strong>${venueLine}` +
      `${eventDateStr ? ` din data de <strong>${eventDateStr}</strong>` : ''}.</p>` +
      `<p>Te asteptam la locatie pentru a confirma rezervarea pana la <strong>${expiresStr}</strong>. ` +
      `Dupa acest termen locul poate fi realocat.</p>`,
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
