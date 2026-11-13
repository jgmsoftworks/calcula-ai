import { expect, it } from 'vitest';
import { errorMessage, errorString } from '../errors';

it('preserves Error and SDK text fields while allowing existing fallbacks', () => {
  expect(errorMessage(new Error('failure'))).toBe('failure');
  expect(errorMessage({ message: 'denied', code: '42501' })).toBe('denied');
  expect(errorString({ code: '42501' }, 'code')).toBe('42501');
  for (const value of [null, undefined, 'failure', 42, { message: 42 }]) {
    expect(errorMessage(value) || 'fallback').toBe('fallback');
  }
});
