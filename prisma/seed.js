import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.eventTask.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.event.deleteMany();
  await prisma.client.deleteMany();
  await prisma.venue.deleteMany();

  const organization = await prisma.organization.upsert({
    where: { slug: 'eveniment-demo' },
    update: { name: 'Eveniment Demo' },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Eveniment Demo',
      slug: 'eveniment-demo',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eveniment.local' },
    update: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      name: 'Admin Eveniment',
      email: 'admin@eveniment.local',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      role: 'admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@eveniment.local' },
    update: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      name: 'Manager Events',
      email: 'manager@eveniment.local',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: 'manager',
    },
  });

  const venueRoyal = await prisma.venue.create({
    data: {
      name: 'Salon Royal',
      organizationId: organization.id,
      address: 'Str. Principala 12, Bucuresti',
      capacity: 260,
      description: 'Salon premium pentru nunti si corporate.',
      status: 'active',
    },
  });

  const venueGarden = await prisma.venue.create({
    data: {
      name: 'Garden Ballroom',
      organizationId: organization.id,
      address: 'Bd. Unirii 88, Bucuresti',
      capacity: 180,
      description: 'Spatiu luminos cu terasa pentru evenimente private.',
      status: 'active',
    },
  });

  const clientPopescu = await prisma.client.create({
    data: {
      fullName: 'Andreea Popescu',
      organizationId: organization.id,
      phone: '+40722111222',
      email: 'andreea.popescu@example.com',
      notes: 'Preferinte meniu vegetarian pentru 20 persoane.',
    },
  });

  const clientIonescu = await prisma.client.create({
    data: {
      fullName: 'Mihai Ionescu',
      organizationId: organization.id,
      phone: '+40733111333',
      email: 'mihai.ionescu@example.com',
      notes: 'Eveniment corporate cu scena si videoproiector.',
    },
  });

  const wedding = await prisma.event.create({
    data: {
      clientId: clientPopescu.id,
      organizationId: organization.id,
      venueId: venueRoyal.id,
      title: 'Nunta Andreea & Vlad',
      eventType: 'wedding',
      eventDate: addDays(10),
      startTime: '18:00',
      endTime: '03:00',
      guestsCount: 220,
      status: 'confirmed',
      totalAmount: 99000,
      depositAmount: 15000,
      paidAmount: 15000,
      remainingAmount: 84000,
      notes: 'Tema: elegant, alb-verde.',
    },
  });

  const corporate = await prisma.event.create({
    data: {
      clientId: clientIonescu.id,
      organizationId: organization.id,
      venueId: venueGarden.id,
      title: 'Gala Tech Partners',
      eventType: 'corporate',
      eventDate: addDays(5),
      startTime: '17:00',
      endTime: '23:00',
      guestsCount: 140,
      status: 'in_preparation',
      totalAmount: 42000,
      depositAmount: 10000,
      paidAmount: 7000,
      remainingAmount: 35000,
      notes: 'Necesita welcome drink si zona networking.',
    },
  });

  await prisma.lead.create({
    data: {
      clientId: clientPopescu.id,
      organizationId: organization.id,
      eventType: 'baptism',
      estimatedGuests: 80,
      desiredDate: addDays(45),
      status: 'viewing',
      source: 'Instagram',
      notes: 'A cerut oferta pentru duminica.',
    },
  });

  await prisma.offer.create({
    data: {
      clientId: clientPopescu.id,
      organizationId: organization.id,
      eventId: wedding.id,
      venueId: venueRoyal.id,
      eventType: 'wedding',
      guestsCount: 220,
      selectedPackage: 'Premium Wedding',
      totalAmount: 99000,
      status: 'accepted',
      validUntil: addDays(14),
    },
  });

  await prisma.contract.create({
    data: {
      eventId: wedding.id,
      organizationId: organization.id,
      clientId: clientPopescu.id,
      contractNumber: 'CTR-2026-0001',
      status: 'signed',
      signedAt: new Date(),
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      eventId: wedding.id,
      organizationId: organization.id,
      clientId: clientPopescu.id,
      invoiceNumber: 'INV-2026-0001',
      amount: 15000,
      status: 'paid',
      dueDate: addDays(3),
    },
  });

  await prisma.payment.create({
    data: {
      eventId: wedding.id,
      organizationId: organization.id,
      invoiceId: invoice.id,
      clientId: clientPopescu.id,
      amount: 15000,
      paymentMethod: 'bank_transfer',
      status: 'succeeded',
      paidAt: new Date(),
    },
  });

  await prisma.eventTask.createMany({
    data: [
      { organizationId: organization.id, eventId: wedding.id, title: 'Confirmare meniu final', status: 'todo', dueDate: addDays(3), assignedTo: manager.id },
      { organizationId: organization.id, eventId: wedding.id, title: 'Verificare decor floral', status: 'in_progress', dueDate: addDays(7), assignedTo: admin.id },
      { organizationId: organization.id, eventId: corporate.id, title: 'Setup scena si ecran', status: 'todo', dueDate: addDays(2), assignedTo: manager.id },
    ],
  });

  console.log('Seed finalizat.');
  console.log('Admin: admin@eveniment.local / Admin123!');
  console.log('Manager: manager@eveniment.local / Manager123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
