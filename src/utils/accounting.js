import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function eventAmounts(data) {
  const total = new Prisma.Decimal(data.totalAmount ?? 0);
  const paid = new Prisma.Decimal(data.paidAmount ?? 0);
  return {
    totalAmount: total,
    depositAmount: new Prisma.Decimal(data.depositAmount ?? 0),
    paidAmount: paid,
    remainingAmount: total.minus(paid),
  };
}

export async function recalculateEventPayments(tx, eventId) {
  const payments = await tx.payment.findMany({
    where: { eventId, status: 'succeeded' },
    select: { amount: true },
  });
  const event = await tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { totalAmount: true } });
  const paidAmount = payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  await tx.event.update({
    where: { id: eventId },
    data: { paidAmount, remainingAmount: new Prisma.Decimal(event.totalAmount).minus(paidAmount) },
  });
}

export async function recalculateInvoiceStatus(tx, invoiceId) {
  if (!invoiceId) return;
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { amount: true } });
  if (!invoice) return;
  const payments = await tx.payment.findMany({
    where: { invoiceId, status: 'succeeded' },
    select: { amount: true },
  });
  const paid = payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const amount = new Prisma.Decimal(invoice.amount);
  const status = paid.greaterThanOrEqualTo(amount) ? 'paid' : paid.greaterThan(0) ? 'partially_paid' : 'unpaid';
  await tx.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export async function persistPaymentSuccess(paymentId, externalPaymentId) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: 'succeeded', externalPaymentId, paidAt: new Date() },
    });
    await recalculateEventPayments(tx, payment.eventId);
    await recalculateInvoiceStatus(tx, payment.invoiceId);
  });
}
