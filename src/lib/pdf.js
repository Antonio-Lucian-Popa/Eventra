import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { config } from '../config/env.js';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writePdf(filename, build) {
  const dir = path.resolve(config.storageDir, 'documents');
  ensureDir(dir);
  const absolutePath = path.join(dir, filename);
  const publicPath = `/documents/${filename}`;
  const doc = new PDFDocument({ margin: 48 });
  doc.pipe(fs.createWriteStream(absolutePath));
  build(doc);
  doc.end();
  return publicPath;
}

function decodeSignature(signatureData) {
  if (!signatureData || typeof signatureData !== 'string') return null;
  const match = signatureData.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  const base64 = match ? match[2] : signatureData;
  try {
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
}

export function generateContractPdf(contract) {
  return writePdf(`contract-${contract.contractNumber}.pdf`, (doc) => {
    doc.fontSize(20).text(`Contract ${contract.contractNumber}`);
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${contract.client.fullName}`);
    doc.text(`Eveniment: ${contract.event.title}`);
    doc.text(`Data eveniment: ${new Date(contract.event.eventDate).toLocaleDateString('ro-RO')}`);
    doc.text(`Locatie: ${contract.event.venue?.name || ''}`);
    doc.text(`Status: ${contract.status}`);
    if (contract.signedAt) doc.text(`Semnat la: ${new Date(contract.signedAt).toLocaleString('ro-RO')}`);
    doc.moveDown();
    doc.text('Document generat automat de Eveniment App.');

    // Semnatura electronica a clientului, aplicata direct in aplicatie.
    const signature = decodeSignature(contract.signatureData);
    if (signature) {
      doc.moveDown(2);
      doc.fontSize(12).text('Semnatura client:');
      doc.moveDown(0.5);
      try {
        doc.image(signature, { fit: [220, 90] });
      } catch {
        doc.text('[semnatura indisponibila]');
      }
      if (contract.signerName) doc.moveDown(0.3).fontSize(10).text(`Semnat de: ${contract.signerName}`);
    }
  });
}

export function generateInvoicePdf(invoice) {
  return writePdf(`invoice-${invoice.invoiceNumber}.pdf`, (doc) => {
    doc.fontSize(20).text(`Factura ${invoice.invoiceNumber}`);
    doc.moveDown();
    doc.fontSize(12).text(`Client: ${invoice.client.fullName}`);
    doc.text(`Eveniment: ${invoice.event.title}`);
    doc.text(`Suma: ${invoice.amount} RON`);
    doc.text(`Status: ${invoice.status}`);
    if (invoice.dueDate) doc.text(`Scadenta: ${new Date(invoice.dueDate).toLocaleDateString('ro-RO')}`);
    doc.moveDown();
    doc.text('Document generat automat de Eveniment App.');
  });
}
