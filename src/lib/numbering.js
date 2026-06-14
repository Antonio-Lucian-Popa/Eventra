import { prisma } from './prisma.js';

const prefixes = {
  contract: 'CTR',
  invoice: 'INV',
};

export async function nextNumber(tx, organizationId, type) {
  const prefix = `${prefixes[type] || type.toUpperCase()}-${new Date().getFullYear()}`;
  const sequence = await tx.numberSequence.upsert({
    where: { organizationId_type: { organizationId, type } },
    update: { nextValue: { increment: 1 }, prefix },
    create: { organizationId, type, prefix, nextValue: 2 },
  });
  return `${prefix}-${String(sequence.nextValue).padStart(4, '0')}`;
}

export async function nextNumberStandalone(organizationId, type) {
  return prisma.$transaction((tx) => nextNumber(tx, organizationId, type));
}
