'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Wallet, Users, Package } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface Metrics {
  revenue: number;
  expenses: number;
  outstanding: number;
  cashFlow: number;
  currency: string;
  period: string;
  counts: { customers: number; products: number };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    setOrgId(localStorage.getItem('flowbooks_org_id'));
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
      description: 'This month',
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      title: 'Expenses',
      value: metrics ? formatCurrency(metrics.expenses, metrics.currency) : '—',
      description: 'This month',
      icon: TrendingDown,
      trend: 'down' as const,
    },
    {
      title: 'Outstanding',
      value: metrics ? formatCurrency(metrics.outstanding, metrics.currency) : '—',
      description: 'Unpaid invoices',
      icon: Clock,
      trend: 'neutral' as const,
    },
    {
      title: 'Cash Flow',
      value: metrics ? formatCurrency(metrics.cashFlow, metrics.currency) : '—',
      description: 'Net this month',
      icon: Wallet,
      trend: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business finances</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted" />
                  ) : (
                    card.value
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.counts.customers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.counts.products}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
