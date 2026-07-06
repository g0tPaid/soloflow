import { z } from 'zod';
import { ROLES } from '../constants';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Organization ────────────────────────────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  logo: z.string().url().optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.SALES,
    ROLES.EMPLOYEE,
    ROLES.CUSTOM,
  ] as [string, ...string[]]),
});

// ─── Customer ────────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  taxId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Product ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  unitPrice: z.number().min(0),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(1).optional(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  items: z.array(invoiceItemSchema).optional(),
});

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
