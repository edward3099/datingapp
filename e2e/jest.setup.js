const detox = require('detox');

beforeAll(async () => {
  await detox.init();
});

afterAll(async () => {
  await detox.cleanup();
});

