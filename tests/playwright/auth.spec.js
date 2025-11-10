const { test, expect } = require('@playwright/test');

test.describe('Expo web auth surface', () => {
  test('renders the splash screen and login CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Get Started')).toBeVisible();
  });
});

