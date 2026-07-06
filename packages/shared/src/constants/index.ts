export const APP_NAME = 'FlowBooks';
export const APP_DESCRIPTION = 'Modern Accounting & Business Management';

export const BRAND_COLOR = '#2563EB';
export const BRAND_COLOR_HOVER = '#1D4ED8';

export const API_VERSION = 'v1';
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_TIMEZONE = 'UTC';

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
  { key: 'expenses', label: 'Expenses', href: '/expenses', enabled: false },
  { key: 'banking', label: 'Banking', href: '/banking', enabled: false },
  { key: 'reports', label: 'Reports', href: '/reports', enabled: false },
  { key: 'payroll', label: 'Payroll', href: '/payroll', enabled: false },
  { key: 'inventory', label: 'Inventory', href: '/inventory', enabled: false },
  { key: 'projects', label: 'Projects', href: '/projects', enabled: false },
  { key: 'crm', label: 'CRM', href: '/crm', enabled: false },
  { key: 'settings', label: 'Settings', href: '/settings', enabled: true },
] as const;
