import type { Role, Permission, FeatureFlag } from '../constants';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  role: Role;
  permissions: Permission[];
}

export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  cashFlow: number;
  currency: string;
  period: string;
}

export interface TenantRequest {
  organizationId: string;
  userId?: string;
}

export interface FeatureFlagConfig {
  key: FeatureFlag;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface StorageConfig {
  provider: 'local' | 's3';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  localPath?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
