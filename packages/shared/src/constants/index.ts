export const APP_NAME = 'SoloFlow';
export const APP_DESCRIPTION = 'Simple accounting for solopreneurs';
export const BRAND_COLOR = '#E40046';
export const BRAND_COLOR_HOVER = '#C2003C';

export const API_VERSION = 'v1';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
] as const;

export const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia' },
  { value: 'Europe/London', label: 'UK (GMT)' },
  { value: 'America/New_York', label: 'US Eastern' },
  { value: 'America/Los_Angeles', label: 'US Pacific' },
  { value: 'UTC', label: 'UTC' },
] as const;

/** Recommended invoice PDF promotional banner dimensions (use PNG for sharp text) */
export const INVOICE_BANNER_SIZE = {
  width: 2400,
  height: 400,
  label: '2400 × 400 px',
} as const;

export const SHIPPING_METHODS = [
  { value: 'AIR', label: 'Air' },
  { value: 'SEA', label: 'Ship' },
] as const;

export const SHIPPING_TERMS = [
  { value: 'DDP', label: 'DDP (Delivered Duty Paid)' },
  { value: 'LCL', label: 'LCL (Less than Container Load)' },
] as const;

export type ShippingMethod = (typeof SHIPPING_METHODS)[number]['value'];
export type ShippingTerms = (typeof SHIPPING_TERMS)[number]['value'];

export const TENANT_HEADER = 'x-organization-id';

export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  SALES: 'SALES',
  EMPLOYEE: 'EMPLOYEE',
  CUSTOM: 'CUSTOM',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Organization
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  ORG_MANAGE_MEMBERS: 'org:manage_members',
  ORG_MANAGE_SETTINGS: 'org:manage_settings',
  // Customers
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  // Products
  PRODUCTS_READ: 'products:read',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  // Invoices
  INVOICES_READ: 'invoices:read',
  INVOICES_CREATE: 'invoices:create',
  INVOICES_UPDATE: 'invoices:update',
  INVOICES_DELETE: 'invoices:delete',
  INVOICES_SEND: 'invoices:send',
  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  // Audit
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: Object.values(PERMISSIONS),
  ADMIN: Object.values(PERMISSIONS).filter((p) => p !== PERMISSIONS.ORG_DELETE),
  MANAGER: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.INVOICES_SEND,
    PERMISSIONS.REPORTS_READ,
  ],
  ACCOUNTANT: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_UPDATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_READ,
  ],
  SALES: [
    PERMISSIONS.ORG_READ,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.PRODUCTS_READ,
    PERMISSIONS.INVOICES_READ,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_SEND,
  ],
  EMPLOYEE: [PERMISSIONS.ORG_READ, PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.PRODUCTS_READ, PERMISSIONS.INVOICES_READ],
  CUSTOM: [],
};

export const FEATURE_FLAGS = {
  INVOICING: 'invoicing',
  INVENTORY: 'inventory',
  PAYROLL: 'payroll',
  EXPENSES: 'expenses',
  BANKING: 'banking',
  REPORTS: 'reports',
  CRM: 'crm',
  PROJECTS: 'projects',
  TIME_TRACKING: 'time_tracking',
  MULTI_CURRENCY: 'multi_currency',
  CUSTOM_FIELDS: 'custom_fields',
  API_ACCESS: 'api_access',
  WEBHOOKS: 'webhooks',
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const NAV_MODULES = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', enabled: true },
  { key: 'customers', label: 'Customers', href: '/customers', enabled: true },
  { key: 'products', label: 'Products', href: '/products', enabled: true },
  { key: 'invoices', label: 'Invoices', href: '/invoices', enabled: true },
  { key: 'expenses', label: 'Expenses', href: '/expenses', enabled: true },
  { key: 'receipts', label: 'Receipts', href: '/receipts', enabled: true },
  { key: 'settings', label: 'Company Details', href: '/settings', enabled: true },
  { key: 'reports', label: 'Reports', href: '/reports', enabled: false },
  { key: 'inventory', label: 'Inventory', href: '/inventory', enabled: false },
] as const;
