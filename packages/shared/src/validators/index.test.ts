import { describe, it, expect } from 'vitest';
import { createCustomerSchema, createPaymentSchema, loginSchema } from './index';

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

  describe('createPaymentSchema', () => {
    it('accepts a positive partial payment', () => {
      const result = createPaymentSchema.safeParse({
        amount: 250.5,
        paidAt: '2026-09-11',
        method: 'BANK',
        note: 'first installment',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a zero payment', () => {
      const result = createPaymentSchema.safeParse({ amount: 0 });
      expect(result.success).toBe(false);
    });
  });
});
