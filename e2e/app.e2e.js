describe('Onboarding entry point', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
  });

  it('shows the splash call-to-action', async () => {
    await expect(element(by.text('Get Started'))).toBeVisible();
  });
});

