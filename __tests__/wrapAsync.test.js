import { wrapAsync, safePromise, safeExecute } from '../utils/wrapAsync';
import { logger } from '../utils/logger';

describe('wrapAsync utilities', () => {
  beforeEach(() => {
    logger.clear?.();
  });

  it('wrapAsync forwards successful results', async () => {
    const asyncFn = jest.fn(async (value) => value * 2);
    const wrapped = wrapAsync(asyncFn, 'double');

    await expect(wrapped(4)).resolves.toBe(8);
    expect(asyncFn).toHaveBeenCalledWith(4);
  });

  it('wrapAsync logs and rethrows errors', async () => {
    const error = new Error('boom');
    const asyncFn = jest.fn(async () => {
      throw error;
    });
    const wrapped = wrapAsync(asyncFn, 'failingFn');

    await expect(wrapped({ password: 'secret' })).rejects.toThrow('boom');
    const logs = logger.getLogs();
    const lastLog = logs[logs.length - 1];

    expect(lastLog.level).toBe('ERROR');
    expect(lastLog.message).toContain('failingFn');
    expect(lastLog.data.args[0].password).toBe('[REDACTED]');
  });

  it('safePromise logs and rethrows errors', async () => {
    const error = new Error('promise failure');
    await expect(
      safePromise(Promise.reject(error), 'promiseTest')
    ).rejects.toThrow('promise failure');

    const logs = logger.getLogs();
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('promiseTest');
  });

  it('safeExecute logs without throwing', async () => {
    const error = new Error('fire and forget');
    await safeExecute(async () => {
      throw error;
    }, 'background job');

    const logs = logger.getLogs();
    const lastLog = logs[logs.length - 1];
    expect(lastLog.level).toBe('ERROR');
    expect(lastLog.message).toContain('background job');
  });
});

