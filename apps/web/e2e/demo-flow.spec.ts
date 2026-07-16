import { test, expect } from '@playwright/test';

test('demo flow: login → simulate analysis → call details', async ({ page }) => {
  test.skip(!process.env.E2E_READY, 'Set E2E_READY=1 with running stack to execute');

  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@closerai.demo');
  await page.getByLabel('Password').fill('DemoPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto('/leads');
  await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Sarah' }).first().click();
  await expect(page.getByText('BrightLedger')).toBeVisible();

  await page.goto('/dev/demo');
  await page.getByLabel('All seeded leads').selectOption({ label: /Sarah Chen/ });
  await page.getByLabel('Event').selectOption('call_analyzed');
  await page.getByRole('button', { name: 'Simulate Retell Webhook' }).click();

  await expect(page).toHaveURL(/calls\//, { timeout: 15_000 });
  await expect(page.getByText('Lead score')).toBeVisible();
  await expect(page.getByText('BANT qualification')).toBeVisible();
  await expect(page.getByText('Objections')).toBeVisible();
  await expect(page.getByText(/MEETING_BOOKED|Simulated/)).toBeVisible();
});
