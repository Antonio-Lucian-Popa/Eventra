import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

async function login() {
  const res = await request(app).post('/auth/login').send({
    email: 'admin@eveniment.local',
    password: 'Admin123!',
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.ok(res.body.data.refreshToken);
  return res.body.data;
}

test('auth login and refresh token rotation', async () => {
  const session = await login();
  const refreshed = await request(app).post('/auth/refresh').send({ refreshToken: session.refreshToken });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.data.token);
  assert.ok(refreshed.body.data.refreshToken);

  const reused = await request(app).post('/auth/refresh').send({ refreshToken: session.refreshToken });
  assert.equal(reused.status, 401);
});

test('dashboard summary is available for admin', async () => {
  const session = await login();
  const res = await request(app).get('/dashboard/summary').set('authorization', `Bearer ${session.token}`);
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.data.currentMonthEvents, 'number');
  assert.ok(Array.isArray(res.body.data.eventTypeDistribution));
});

test('venue conflict is rejected for overlapping event intervals', async () => {
  const session = await login();
  const list = await request(app).get('/events').set('authorization', `Bearer ${session.token}`);
  assert.equal(list.status, 200);
  const existing = list.body.data[0];

  const res = await request(app)
    .post('/events')
    .set('authorization', `Bearer ${session.token}`)
    .send({
      clientId: existing.clientId,
      venueId: existing.venueId,
      title: 'Overlap test',
      eventType: existing.eventType,
      eventDate: existing.eventDate,
      startTime: existing.startTime,
      endTime: existing.endTime,
      guestsCount: 20,
      totalAmount: 1000,
    });

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'venue_conflict');
});

test('clients use soft delete', async () => {
  const session = await login();
  const created = await request(app)
    .post('/clients')
    .set('authorization', `Bearer ${session.token}`)
    .send({ fullName: 'Client Test Soft Delete', phone: '+40700000000', email: 'soft-delete@example.com' });
  assert.equal(created.status, 201);

  const deleted = await request(app).delete(`/clients/${created.body.data.id}`).set('authorization', `Bearer ${session.token}`);
  assert.equal(deleted.status, 204);

  const found = await prisma.client.findUnique({ where: { id: created.body.data.id } });
  assert.ok(found.deletedAt);

  const getDeleted = await request(app).get(`/clients/${created.body.data.id}`).set('authorization', `Bearer ${session.token}`);
  assert.equal(getDeleted.status, 404);
});

test.after(async () => {
  await prisma.$disconnect();
});
