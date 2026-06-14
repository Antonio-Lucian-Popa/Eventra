import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredRoutes = [
  'app/page.js',
  'app/login/page.js',
  'app/calendar/page.js',
  'app/events/page.js',
  'app/events/[id]/page.js',
  'app/clients/page.js',
  'app/venues/page.js',
  'app/leads/page.js',
  'app/offers/page.js',
  'app/contracts/page.js',
  'app/invoices/page.js',
  'app/payments/page.js',
  'app/reports/page.js',
  'app/settings/page.js',
];

test('required frontend routes exist', () => {
  for (const route of requiredRoutes) {
    assert.ok(fs.existsSync(path.join(root, route)), `${route} should exist`);
  }
});

test('api client includes auth refresh support', () => {
  const api = fs.readFileSync(path.join(root, 'lib/api.js'), 'utf8');
  assert.match(api, /\/auth\/refresh/);
  assert.match(api, /refreshSession/);
  assert.match(api, /Authorization|authorization/);
});

test('crud pages are mapped to backend endpoints', () => {
  const config = fs.readFileSync(path.join(root, 'lib/resource-configs.js'), 'utf8');
  for (const endpoint of ['/events', '/venues', '/clients', '/leads', '/offers', '/contracts', '/invoices', '/payments']) {
    assert.match(config, new RegExp(`endpoint: '${endpoint}'`));
  }
});
