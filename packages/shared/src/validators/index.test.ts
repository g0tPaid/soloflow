import { describe, it, expect } from 'vitest';
import {
  createCustomerSchema,
  createPaymentSchema,
  inviteMemberSchema,
  loginSchema,
  updateInvoiceSchema,
} from './index';

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

  describe('updateInvoiceSchema fulfillment', () => {
    it('accepts a fulfillment stage with both tracking numbers', () => {
      const result = updateInvoiceSchema.safeParse({
        fulfillmentStatus: 'SHIPPED_INTERNATIONAL',
        localTrackingNumber: '  SF123456  ',
        internationalTrackingNumber: 'INT-9988',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.localTrackingNumber).toBe('SF123456');
        expect(result.data.internationalTrackingNumber).toBe('INT-9988');
      }
    });

    it('accepts clearing the fulfillment stage', () => {
      const result = updateInvoiceSchema.safeParse({ fulfillmentStatus: null });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown fulfillment stage', () => {
      const result = updateInvoiceSchema.safeParse({ fulfillmentStatus: 'SHIPPED' });
      expect(result.success).toBe(false);
    });

    it('rejects a tracking number before that ship step', () => {
      const result = updateInvoiceSchema.safeParse({
        fulfillmentStatus: 'QC_COMPLETED',
        localTrackingNumber: 'SF1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a tracking number longer than 80 characters', () => {
      const result = updateInvoiceSchema.safeParse({
        fulfillmentStatus: 'SHIPPED_TO_CHINA_CENTER',
        localTrackingNumber: 'X'.repeat(81),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('inviteMemberSchema', () => {
    it('accepts an employee invite with a name', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'staff@example.com',
        name: 'Asha',
        role: 'EMPLOYEE',
      });
      expect(result.success).toBe(true);
    });

    it('rejects inviting an owner', () => {
      const result = inviteMemberSchema.safeParse({
        email: 'boss@example.com',
        role: 'OWNER',
      });
      expect(result.success).toBe(false);
    });
  });
});
