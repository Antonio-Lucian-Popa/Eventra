import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const organizationId = '00000000-0000-4000-8000-000000000001';

function atOffset(days, hour = 12) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function money(value) {
  return Number(value).toFixed(2);
}

function remaining(totalAmount, paidAmount) {
  return money(Number(totalAmount) - Number(paidAmount));
}

function tokenHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function resetDemoData() {
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
  await prisma.numberSequence.deleteMany();
}

async function seedUsers(organization) {
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const managerHash = await bcrypt.hash('Manager123!', 12);
  const staffHash = await bcrypt.hash('Staff123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eveniment.local' },
    update: { organizationId: organization.id, name: 'Andrei Popescu', role: 'admin', deletedAt: null },
    create: {
      organizationId: organization.id,
      name: 'Andrei Popescu',
      email: 'admin@eveniment.local',
      passwordHash,
      role: 'admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@eveniment.local' },
    update: { organizationId: organization.id, name: 'Mara Ionescu', role: 'manager', deletedAt: null },
    create: {
      organizationId: organization.id,
      name: 'Mara Ionescu',
      email: 'manager@eveniment.local',
      passwordHash: managerHash,
      role: 'manager',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@eveniment.local' },
    update: { organizationId: organization.id, name: 'Cristian Radu', role: 'staff', deletedAt: null },
    create: {
      organizationId: organization.id,
      name: 'Cristian Radu',
      email: 'staff@eveniment.local',
      passwordHash: staffHash,
      role: 'staff',
    },
  });

  return { admin, manager, staff };
}

async function main() {
  await resetDemoData();

  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: { name: 'EventPro Demo', slug: 'eventpro-demo' },
    create: {
      id: organizationId,
      name: 'EventPro Demo',
      slug: 'eventpro-demo',
    },
  });

  const users = await seedUsers(organization);

  const venues = await Promise.all(
    [
      {
        key: 'imperial',
        name: 'Salon Imperial',
        address: 'Bulevardul Unirii 18, Bucuresti',
        capacity: 260,
        description: 'Salon premium pentru nunti mari, corporate si gale.',
      },
      {
        key: 'crystal',
        name: 'Salon Crystal',
        address: 'Strada Paris 42, Bucuresti',
        capacity: 180,
        description: 'Salon elegant pentru botezuri, majorate si evenimente private.',
      },
      {
        key: 'royal',
        name: 'Salon Royal',
        address: 'Soseaua Nordului 7, Bucuresti',
        capacity: 140,
        description: 'Salon luminos, potrivit pentru evenimente familiale.',
      },
      {
        key: 'garden',
        name: 'Terasa Garden',
        address: 'Aleea Lacului 4, Snagov',
        capacity: 95,
        description: 'Terasa cu gradina pentru cununii, brunch si cocktail.',
      },
    ].map((venue) =>
      prisma.venue.create({
        data: {
          organizationId: organization.id,
          name: venue.name,
          address: venue.address,
          capacity: venue.capacity,
          description: venue.description,
          status: 'active',
        },
      }),
    ),
  );

  const venueByKey = Object.fromEntries(['imperial', 'crystal', 'royal', 'garden'].map((key, index) => [key, venues[index]]));

  const clientRows = [
    ['Andreea Popescu', '+40722123456', 'andreea.popescu@email.com', 'Mireasa prefera decor alb-verde si meniu cu optiuni vegetariene.'],
    ['Mihai Dumitrescu', '+40733456789', 'mihai.dumitrescu@email.com', 'Corporate anual, are nevoie de scena, ecran LED si networking area.'],
    ['Ioana & Radu Ionescu', '+40723566789', 'ionescu.radu@email.com', 'Nunta cu invitati din afara tarii, prefera meniu international.'],
    ['Maria & Vlad Stoica', '+40744780321', 'maria.stoica@email.com', 'Botez, doresc candy bar pastel si zona foto.'],
    ['Alexandru Matei', '+40795321654', 'alex.matei@email.com', 'Majorat cu DJ si lumini dinamice.'],
    ['Laura & Andrei Pavel', '+40720987654', 'laura.pavel@email.com', 'Nunta restransa, focus pe meniu premium.'],
    ['David Popa', '+40741258369', 'david.popa@email.com', 'Botez duminica, prefera terasa daca vremea permite.'],
    ['Oana Georgescu', '+40730369147', 'ioana.georgescu@email.com', 'Eveniment corporate de lansare produs.'],
    ['Elena Marinescu', '+40755222888', 'elena.marinescu@email.com', 'Cununie civila cu cocktail.'],
    ['Robert Enache', '+40766222999', 'robert.enache@email.com', 'Majorat, buget mediu, cere oferta rapida.'],
    ['Diana Petrescu', '+40771234567', 'diana.petrescu@email.com', 'Botez in luna urmatoare, 90 invitati.'],
    ['TechNova SRL', '+40211234567', 'events@technova.ro', 'Client B2B, prefera factura si plata prin transfer.'],
  ];

  const clients = await Promise.all(
    clientRows.map(([fullName, phone, email, notes]) =>
      prisma.client.create({
        data: { organizationId: organization.id, fullName, phone, email, notes },
      }),
    ),
  );

  const c = Object.fromEntries(clients.map((client) => [client.fullName, client]));

  const eventDefinitions = [
    {
      title: 'Nunta Andreea & Mihai',
      client: c['Andreea Popescu'],
      venue: venueByKey.imperial,
      eventType: 'wedding',
      days: 2,
      startTime: '18:00',
      endTime: '03:00',
      guestsCount: 250,
      status: 'confirmed',
      totalAmount: 87500,
      depositAmount: 15000,
      paidAmount: 30000,
      notes: 'Tema alb-verde, format elegant, meniu cu optiuni vegetariene.',
    },
    {
      title: 'Gala Tech Partners',
      client: c['Mihai Dumitrescu'],
      venue: venueByKey.imperial,
      eventType: 'corporate',
      days: 4,
      startTime: '17:00',
      endTime: '23:00',
      guestsCount: 190,
      status: 'in_preparation',
      totalAmount: 52000,
      depositAmount: 12000,
      paidAmount: 12000,
      notes: 'Scena, pupitru, ecran LED, zona networking si welcome drink.',
    },
    {
      title: 'Botez Sofia Maria',
      client: c['Maria & Vlad Stoica'],
      venue: venueByKey.royal,
      eventType: 'baptism',
      days: 6,
      startTime: '15:00',
      endTime: '22:00',
      guestsCount: 115,
      status: 'confirmed',
      totalAmount: 24500,
      depositAmount: 5000,
      paidAmount: 7500,
      notes: 'Candy bar pastel, photo corner si meniu copii.',
    },
    {
      title: 'Majorat Alex',
      client: c['Alexandru Matei'],
      venue: venueByKey.crystal,
      eventType: 'birthday',
      days: 8,
      startTime: '19:00',
      endTime: '02:00',
      guestsCount: 85,
      status: 'confirmed',
      totalAmount: 12500,
      depositAmount: 3000,
      paidAmount: 3000,
      notes: 'DJ, lumini dinamice, meniu finger food.',
    },
    {
      title: 'Nunta Ioana & Radu',
      client: c['Ioana & Radu Ionescu'],
      venue: venueByKey.imperial,
      eventType: 'wedding',
      days: 12,
      startTime: '18:30',
      endTime: '04:00',
      guestsCount: 230,
      status: 'confirmed',
      totalAmount: 79000,
      depositAmount: 12000,
      paidAmount: 12000,
      notes: 'Meniu international, invitati din Italia si Germania.',
    },
    {
      title: 'Cununie Elena & Paul',
      client: c['Elena Marinescu'],
      venue: venueByKey.garden,
      eventType: 'other',
      days: 15,
      startTime: '13:00',
      endTime: '19:00',
      guestsCount: 70,
      status: 'draft',
      totalAmount: 9800,
      depositAmount: 2000,
      paidAmount: 0,
      notes: 'Cocktail pe terasa, decor minimalist.',
    },
    {
      title: 'Lansare produs TechNova',
      client: c['TechNova SRL'],
      venue: venueByKey.crystal,
      eventType: 'corporate',
      days: -3,
      startTime: '16:00',
      endTime: '22:00',
      guestsCount: 150,
      status: 'completed',
      totalAmount: 34200,
      depositAmount: 10000,
      paidAmount: 34200,
      notes: 'Eveniment finalizat, feedback foarte bun.',
    },
    {
      title: 'Botez David',
      client: c['David Popa'],
      venue: venueByKey.royal,
      eventType: 'baptism',
      days: 22,
      startTime: '14:00',
      endTime: '21:00',
      guestsCount: 90,
      status: 'confirmed',
      totalAmount: 18800,
      depositAmount: 4000,
      paidAmount: 4000,
      notes: 'Eveniment de duminica, zona copii si candy bar.',
    },
    {
      title: 'Corporate Awards',
      client: c['Oana Georgescu'],
      venue: venueByKey.imperial,
      eventType: 'corporate',
      days: 28,
      startTime: '18:00',
      endTime: '23:30',
      guestsCount: 210,
      status: 'confirmed',
      totalAmount: 47500,
      depositAmount: 15000,
      paidAmount: 18000,
      notes: 'Gala cu premii, meniu plated si scena.',
    },
    {
      title: 'Majorat Robert',
      client: c['Robert Enache'],
      venue: venueByKey.crystal,
      eventType: 'birthday',
      days: 35,
      startTime: '19:00',
      endTime: '02:00',
      guestsCount: 75,
      status: 'draft',
      totalAmount: 10600,
      depositAmount: 2500,
      paidAmount: 0,
      notes: 'Oferta in negociere, client sensibil la pret.',
    },
    {
      title: 'Botez Diana',
      client: c['Diana Petrescu'],
      venue: venueByKey.royal,
      eventType: 'baptism',
      days: 42,
      startTime: '15:00',
      endTime: '22:00',
      guestsCount: 95,
      status: 'in_preparation',
      totalAmount: 20500,
      depositAmount: 5000,
      paidAmount: 5000,
      notes: 'Decor floral pastel si meniu copii.',
    },
    {
      title: 'Nunta Laura & Andrei',
      client: c['Laura & Andrei Pavel'],
      venue: venueByKey.garden,
      eventType: 'wedding',
      days: 55,
      startTime: '17:00',
      endTime: '01:00',
      guestsCount: 110,
      status: 'confirmed',
      totalAmount: 38500,
      depositAmount: 7000,
      paidAmount: 7000,
      notes: 'Nunta restransa pe terasa, meniu premium.',
    },
  ];

  const events = [];
  for (const definition of eventDefinitions) {
    events.push(
      await prisma.event.create({
        data: {
          organizationId: organization.id,
          clientId: definition.client.id,
          venueId: definition.venue.id,
          title: definition.title,
          eventType: definition.eventType,
          eventDate: atOffset(definition.days, 12),
          startTime: definition.startTime,
          endTime: definition.endTime,
          guestsCount: definition.guestsCount,
          status: definition.status,
          totalAmount: money(definition.totalAmount),
          depositAmount: money(definition.depositAmount),
          paidAmount: money(definition.paidAmount),
          remainingAmount: remaining(definition.totalAmount, definition.paidAmount),
          notes: definition.notes,
        },
      }),
    );
  }

  const eventByTitle = Object.fromEntries(events.map((event) => [event.title, event]));

  const leadRows = [
    [c['Diana Petrescu'], 'baptism', 90, 18, 'contacted', 'Facebook Ads', 'A cerut disponibilitate pentru duminica.'],
    [c['Robert Enache'], 'birthday', 80, 35, 'negotiation', 'Instagram', 'Buget mediu, interesat de pachet Basic Plus.'],
    [c['Elena Marinescu'], 'other', 60, 14, 'offer_sent', 'Website', 'Cununie civila cu cocktail.'],
    [c['TechNova SRL'], 'corporate', 180, 40, 'viewing', 'Recomandare', 'Vor vizionare Salon Imperial.'],
    [c['Laura & Andrei Pavel'], 'wedding', 120, 55, 'won', 'Targ nunti', 'Lead castigat, eveniment creat.'],
    [c['David Popa'], 'baptism', 95, 22, 'won', 'Google', 'Lead castigat, contract pregatit.'],
    [c['Oana Georgescu'], 'corporate', 210, 28, 'won', 'LinkedIn', 'Client corporate cu potential recurent.'],
    [c['Maria & Vlad Stoica'], 'baptism', 100, 6, 'won', 'Instagram', 'Eveniment confirmat.'],
  ];

  await prisma.lead.createMany({
    data: leadRows.map(([client, eventType, estimatedGuests, days, status, source, notes]) => ({
      organizationId: organization.id,
      clientId: client.id,
      eventType,
      estimatedGuests,
      desiredDate: atOffset(days),
      status,
      source,
      notes,
    })),
  });

  const offers = [
    ['Nunta Andreea & Mihai', 'Premium Wedding', 'accepted', 87500, 250],
    ['Gala Tech Partners', 'Corporate Gala', 'accepted', 52000, 190],
    ['Botez Sofia Maria', 'Baptism Gold', 'accepted', 24500, 115],
    ['Majorat Alex', 'Birthday Party Plus', 'accepted', 12500, 85],
    ['Cununie Elena & Paul', 'Cocktail Garden', 'sent', 9800, 70],
    ['Majorat Robert', 'Birthday Basic Plus', 'sent', 10600, 75],
    ['Corporate Awards', 'Corporate Awards Premium', 'accepted', 47500, 210],
    ['Botez Diana', 'Baptism Gold', 'accepted', 20500, 95],
  ];

  await Promise.all(
    offers.map(([eventTitle, selectedPackage, status, totalAmount, guestsCount], index) => {
      const event = eventByTitle[eventTitle];
      return prisma.offer.create({
        data: {
          organizationId: organization.id,
          clientId: event.clientId,
          eventId: event.id,
          venueId: event.venueId,
          eventType: event.eventType,
          guestsCount,
          selectedPackage,
          totalAmount: money(totalAmount),
          status,
          validUntil: atOffset(10 + index),
        },
      });
    }),
  );

  const signedContracts = [
    'Nunta Andreea & Mihai',
    'Gala Tech Partners',
    'Botez Sofia Maria',
    'Majorat Alex',
    'Nunta Ioana & Radu',
    'Lansare produs TechNova',
    'Botez David',
    'Corporate Awards',
    'Botez Diana',
    'Nunta Laura & Andrei',
  ];

  for (const [index, title] of signedContracts.entries()) {
    const event = eventByTitle[title];
    await prisma.contract.create({
      data: {
        organizationId: organization.id,
        eventId: event.id,
        clientId: event.clientId,
        contractNumber: `CTR-2026-${String(index + 1).padStart(4, '0')}`,
        status: event.status === 'completed' ? 'signed' : 'signed',
        signedAt: atOffset(-20 + index),
        fileUrl: `/documents/contract-CTR-2026-${String(index + 1).padStart(4, '0')}.pdf`,
      },
    });
  }

  let invoiceIndex = 1;
  for (const event of events) {
    const amount = Number(event.totalAmount);
    const paid = Number(event.paidAmount);
    const invoiceStatus = paid >= amount ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid';
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: organization.id,
        eventId: event.id,
        clientId: event.clientId,
        invoiceNumber: `FCT-2026-${String(invoiceIndex).padStart(4, '0')}`,
        amount: money(amount),
        status: invoiceStatus,
        dueDate: atOffset(invoiceIndex % 3 === 0 ? 3 : 12 + invoiceIndex),
        fileUrl: `/documents/invoice-FCT-2026-${String(invoiceIndex).padStart(4, '0')}.pdf`,
      },
    });

    if (paid > 0) {
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          eventId: event.id,
          invoiceId: invoice.id,
          clientId: event.clientId,
          amount: money(paid),
          paymentMethod: invoiceIndex % 2 === 0 ? 'bank_transfer' : 'card',
          status: 'succeeded',
          externalPaymentId: invoiceIndex % 3 === 0 ? `pi_demo_${invoiceIndex}` : null,
          paidAt: atOffset(-invoiceIndex),
        },
      });
    }

    if (invoiceStatus !== 'paid') {
      await prisma.payment.create({
        data: {
          organizationId: organization.id,
          eventId: event.id,
          invoiceId: invoice.id,
          clientId: event.clientId,
          amount: money(Math.max(500, Math.round((amount - paid) * 0.15))),
          paymentMethod: 'stripe',
          status: 'pending',
          externalPaymentId: `cs_demo_pending_${invoiceIndex}`,
        },
      });
    }

    invoiceIndex += 1;
  }

  const taskTemplates = [
    ['Confirmare numar invitati', 'todo', 2],
    ['Plata finala', 'todo', 5],
    ['Degustare meniu', 'done', -2],
    ['Sedinta organizare', 'in_progress', 1],
    ['Confirmare aranjamente florale', 'todo', 4],
    ['Verificare sonorizare si lumini', 'todo', 3],
  ];

  for (const event of events.filter((item) => ['confirmed', 'in_preparation'].includes(item.status)).slice(0, 8)) {
    await prisma.eventTask.createMany({
      data: taskTemplates.map(([title, status, days], index) => ({
        organizationId: organization.id,
        eventId: event.id,
        title,
        description: index % 2 === 0 ? 'Task generat pentru demo si prezentare client.' : null,
        status,
        dueDate: atOffset(days),
        assignedTo: index % 2 === 0 ? users.manager.id : users.staff.id,
      })),
    });
  }

  await prisma.invitation.create({
    data: {
      organizationId: organization.id,
      email: 'coordonator@eveniment.local',
      role: 'manager',
      tokenHash: tokenHash('demo-invitation-token'),
      expiresAt: atOffset(7),
      invitedById: users.admin.id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: users.admin.id,
        action: 'seed_demo',
        entity: 'system',
        metadata: { message: 'Demo data generated for client presentation.' },
      },
      {
        organizationId: organization.id,
        userId: users.manager.id,
        action: 'update',
        entity: 'event',
        entityId: eventByTitle['Gala Tech Partners'].id,
        metadata: { status: 'in_preparation' },
      },
      {
        organizationId: organization.id,
        userId: users.staff.id,
        action: 'complete_task',
        entity: 'eventTask',
        metadata: { title: 'Degustare meniu' },
      },
    ],
  });

  await prisma.numberSequence.createMany({
    data: [
      { organizationId: organization.id, type: 'contract', prefix: 'CTR-2026', nextValue: 11 },
      { organizationId: organization.id, type: 'invoice', prefix: 'INV-2026', nextValue: 13 },
    ],
  });

  console.log('Seed demo finalizat pentru prezentare.');
  console.log('Organizatie: EventPro Demo');
  console.log('Utilizatori demo:');
  console.log('  admin@eveniment.local / Admin123!');
  console.log('  manager@eveniment.local / Manager123!');
  console.log('  staff@eveniment.local / Staff123!');
  console.log(`Date create: ${venues.length} locatii, ${clients.length} clienti, ${events.length} evenimente.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
