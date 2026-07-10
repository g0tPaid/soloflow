import { z } from 'zod';
import { ROLES } from '../constants';
import { CURRENCIES } from '../constants';

const currencyCodes = CURRENCIES.map((c) => c.code) as [string, ...string[]];

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
  currency: z.enum(currencyCodes).default('INR'),
  timezone: z.string().min(1).optional(),
  logo: z.string().optional().nullable(),
  branding: z
    .object({
      tagline: z.string().optional(),
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
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      instagramUrl: z.string().optional(),
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      invoiceBanner: z.string().optional(),
      invoiceSignature: z.string().optional(),
      invoiceOffer1: z.string().optional(),
      invoiceOffer2: z.string().optional(),
      invoiceOffer3: z.string().optional(),
      invoiceOffer4: z.string().optional(),
    })
    .optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  logo: z.string().optional().nullable(),
  branding: z
    .object({
      tagline: z.string().optional(),
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
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      instagramUrl: z.string().optional(),
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      invoiceBanner: z.string().optional(),
      invoiceSignature: z.string().optional(),
      invoiceOffer1: z.string().optional(),
      invoiceOffer2: z.string().optional(),
      invoiceOffer3: z.string().optional(),
      invoiceOffer4: z.string().optional(),
    })
    .optional(),
  fxRates: z.record(z.string(), z.number().positive()).optional(),
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
  currency: z.enum(currencyCodes).default('INR'),
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
  imageUrl: z.string().optional().nullable(),
  unitPrice: z.number().min(0),
  currency: z.string().length(3).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().optional(),
  description: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(1).optional(),
  imageUrl: z.string().optional().nullable(),
});

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format');

const optionalDateField = z
  .union([dateStringSchema, z.literal(''), z.null(), z.undefined()])
  .transform((value) => (value && value !== '' ? value : null));

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  number: z.string().min(1, 'Invoice number is required').max(50).optional(),
  issueDate: dateStringSchema.optional(),
  dueDate: optionalDateField.optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  shippingMethod: z.enum(['AIR', 'SEA']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  number: z.string().min(1, 'Invoice number is required').max(50).optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID']).optional(),
  dueDate: optionalDateField.optional(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  shippingMethod: z.enum(['AIR', 'SEA']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
});

export const updateExpenseCostsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        unitCost: z.number().min(0).optional(),
        unitCostCny: z.number().min(0).optional(),
      }),
    )
    .min(1, 'At least one line item is required'),
  shippingCost: z.number().min(0).optional(),
  shippingCostCny: z.number().min(0).optional(),
});

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type UpdateExpenseCostsInput = z.infer<typeof updateExpenseCostsSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
