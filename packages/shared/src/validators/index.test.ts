import { describe, it, expect } from 'vitest';
import { createCustomerSchema, loginSchema } from './index';

describe('validators', () => {
  describe('loginSchema', () => {
    it('validates correct login input', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createCustomerSchema', () => {
    it('validates customer with required fields', () => {
      const result = createCustomerSchema.safeParse({ name: 'Acme Corp' });
      expect(result.success).toBe(true);
    });
  });
});
