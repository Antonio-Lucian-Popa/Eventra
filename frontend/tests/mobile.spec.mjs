import { test, expect } from '@playwright/test';

test('mobile screenshots for core screens', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('eventpro_token', 'demo-token');
    window.localStorage.setItem('eventpro_refresh', 'demo-refresh');
    window.localStorage.setItem('eventpro_user', JSON.stringify({ name: 'Andrei Popescu', role: 'admin' }));
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile/dashboard.png', fullPage: true });

  await page.goto('/calendar');
  await expect(page.getByRole('heading', { name: 'Calendar - Locații' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile/calendar.png', fullPage: true });

  await page.goto('/events/event-andreea-mihai');
  await expect(page.getByRole('heading', { name: 'Nuntă Andreea & Mihai' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile/event-detail.png', fullPage: true });
});
