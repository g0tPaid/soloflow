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

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'Reset link is invalid'),
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
      /** Company Tax Registration Number (TRN) */
      trn: z.string().optional(),
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      invoiceBanner: z.string().optional(),
      invoiceSignature: z.string().optional(),
      invoiceOffer1: z.string().optional(),
      invoiceOffer2: z.string().optional(),
      invoiceOffer3: z.string().optional(),
      invoiceOffer4: z.string().optional(),
      invoiceAccent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #DC2626')
        .optional(),
      showInvoiceLogo: z.boolean().optional(),
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
      /** Company Tax Registration Number (TRN) */
      trn: z.string().optional(),
      bankName: z.string().optional(),
      accountName: z.string().optional(),
      accountNumber: z.string().optional(),
      invoiceBanner: z.string().optional(),
      invoiceSignature: z.string().optional(),
      invoiceOffer1: z.string().optional(),
      invoiceOffer2: z.string().optional(),
      invoiceOffer3: z.string().optional(),
      invoiceOffer4: z.string().optional(),
      invoiceAccent: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #DC2626')
        .optional(),
      showInvoiceLogo: z.boolean().optional(),
    })
    .optional(),
  fxRates: z.record(z.string(), z.number().positive()).optional(),
  costCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase())
    .optional(),
  dashboardCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((v) => v.toUpperCase())
    .optional(),
  fxEnabled: z.boolean().optional(),
  taxConfig: z
    .object({
      vatRegistered: z.boolean().optional(),
      filingFrequency: z.enum(['quarterly', 'monthly']).optional(),
      defaultEmirate: z.string().max(50).optional(),
    })
    .optional(),
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

// ─── Vendor ──────────────────────────────────────────────────────────────────

export const createVendorSchema = createCustomerSchema;
export const updateVendorSchema = createVendorSchema.partial();

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
  /** Invoice VAT percent (5 = 5%). 0 = off. */
  taxRate: z.number().min(0).max(100).optional(),
  shippingMethod: z.enum(['AIR', 'SEA', 'LOCAL']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL', 'LOCAL']).optional().nullable(),
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
  taxRate: z.number().min(0).max(100).optional(),
  shippingMethod: z.enum(['AIR', 'SEA', 'LOCAL']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL', 'LOCAL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
});

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const quoteItemSchema = invoiceItemSchema;

export const createQuoteSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  number: z.string().min(1, 'Quote number is required').max(50).optional(),
  issueDate: dateStringSchema.optional(),
  validUntil: optionalDateField.optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  shippingMethod: z.enum(['AIR', 'SEA', 'LOCAL']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL', 'LOCAL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
});

export const updateQuoteSchema = z.object({
  number: z.string().min(1, 'Quote number is required').max(50).optional(),
  status: z
    .enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED'])
    .optional(),
  validUntil: optionalDateField.optional(),
  notes: z.string().optional().nullable(),
  discount: z.number().min(0).optional(),
  shipping: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  shippingMethod: z.enum(['AIR', 'SEA', 'LOCAL']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL', 'LOCAL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  items: z.array(quoteItemSchema).min(1, 'At least one item is required').optional(),
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

/** Record a past sale (external invoice) with purchase costs in one step. */
export const createExpenseItemSchema = z.object({
  description: z.string().min(1, 'Item name is required'),
  name: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  /** Cost each in the org cost-entry currency */
  unitCostCny: z.number().min(0).default(0),
});

export const createExpenseSchema = z.object({
  vendorId: z.string().min(1, 'Vendor is required'),
  number: z.string().min(1, 'Invoice number is required').max(50),
  issueDate: dateStringSchema,
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  shipping: z.number().min(0).optional().default(0),
  shippingCostCny: z.number().min(0).optional().default(0),
  shippingMethod: z.enum(['AIR', 'SEA', 'LOCAL']).optional().nullable(),
  shippingTerms: z.enum(['DDP', 'LCL', 'LOCAL']).optional().nullable(),
  shippingFromCountry: z.string().optional().nullable(),
  shippingToCountry: z.string().optional().nullable(),
  /** Purchase VAT % paid to the vendor (UAE input VAT). 5 = 5%. */
  inputTaxRate: z.number().min(0).max(100).optional().default(0),
  items: z.array(createExpenseItemSchema).min(1, 'At least one item is required'),
});

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type UpdateExpenseCostsInput = z.infer<typeof updateExpenseCostsSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateExpenseItemInput = z.infer<typeof createExpenseItemSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
