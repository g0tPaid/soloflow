'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Users,
  Package,
} from 'lucide-react';
import { APP_NAME } from '@flowbooks/shared';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { ORG_STORAGE_KEY, LEGACY_ORG_STORAGE_KEY, useOrganizationId } from '@/hooks/use-organization';
import { MobileHubActions, MobileHubNav } from '@/components/dashboard/mobile-hub-actions';

interface Metrics {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  cashFlow: number;
  currency: string;
  revenueCny?: number;
  expensesCny?: number;
  profitCny?: number;
  outstandingCny?: number;
  cashFlowCny?: number;
  period: string;
  counts: { customers: number; products: number };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { organization } = useOrganizationId();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    setOrgId(
      localStorage.getItem(ORG_STORAGE_KEY) ?? localStorage.getItem(LEGACY_ORG_STORAGE_KEY),
    );
  }, []);

  const { data: metrics, isLoading } = useQuery<Metrics>({
    queryKey: ['dashboard-metrics', orgId],
    queryFn: () => api.dashboard.metrics(session!.accessToken!, orgId!),
    enabled: !!session?.accessToken && !!orgId,
  });

  const metricCards = [
    {
      title: 'Revenue',
      value: metrics ? formatCurrency(metrics.revenue, metrics.currency) : '—',
      secondary:
        metrics?.revenueCny != null ? formatCurrency(metrics.revenueCny, 'CNY') : undefined,
      description: 'Paid this month (USD)',
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      title: 'Expenses',
      value: metrics ? formatCurrency(metrics.expenses, metrics.currency) : '—',
      secondary:
        metrics?.expensesCny != null ? formatCurrency(metrics.expensesCny, 'CNY') : undefined,
      description: 'Costs this month (USD)',
      icon: TrendingDown,
      trend: 'down' as const,
    },
    {
      title: 'Profit',
      value: metrics ? formatCurrency(metrics.profit, metrics.currency) : '—',
      secondary:
        metrics?.profitCny != null ? formatCurrency(metrics.profitCny, 'CNY') : undefined,
      description: 'Revenue minus costs (USD)',
      icon: Wallet,
      trend: 'up' as const,
    },
    {
      title: 'Outstanding',
      value: metrics ? formatCurrency(metrics.outstanding, metrics.currency) : '—',
      secondary:
        metrics?.outstandingCny != null
          ? formatCurrency(metrics.outstandingCny, 'CNY')
          : undefined,
      description: 'Unpaid invoices (USD)',
      icon: Clock,
      trend: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="hidden lg:block">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business finances</p>
      </div>

      <div className="text-center lg:hidden">
        <div className="mx-auto mb-3 mt-2 flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white">
          SF
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Welcome to {APP_NAME}</h1>
        {organization?.name ? (
          <p className="mt-2 text-base text-muted-foreground">{organization.name}</p>
        ) : null}
      </div>

      <div className="lg:hidden">
        <MobileHubActions />
      </div>

      {!orgId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <a href="/onboarding" className="text-primary hover:underline text-sm">
              Create your organization →
            </a>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold sm:text-2xl break-words">
                  {isLoading ? (
                    <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted sm:w-24" />
                  ) : (
                    card.value
                  )}
                </div>
                {!isLoading && card.secondary ? (
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{card.secondary}</p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {metrics && (
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold sm:text-2xl">{metrics.counts.customers}</div>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Products</CardTitle>
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold sm:text-2xl">{metrics.counts.products}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="lg:hidden">
        <MobileHubNav />
      </div>
    </div>
  );
}
