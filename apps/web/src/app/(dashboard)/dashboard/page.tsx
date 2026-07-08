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
  FilePlus2,
  Receipt,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { ORG_STORAGE_KEY, LEGACY_ORG_STORAGE_KEY } from '@/hooks/use-organization';

interface Metrics {
  revenue: number;
  expenses: number;
  profit: number;
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
      title: 'Profit',
      value: metrics ? formatCurrency(metrics.profit, metrics.currency) : '—',
      description: 'Revenue minus costs (this month)',
      icon: Wallet,
      trend: 'up' as const,
    },
    {
      title: 'Outstanding',
      value: metrics ? formatCurrency(metrics.outstanding, metrics.currency) : '—',
      description: 'Unpaid invoices',
      icon: Clock,
      trend: 'neutral' as const,
    },
  ];

  const quickLinks: {
    href: string;
    label: string;
    icon: LucideIcon;
    box: string;
  }[] = [
    {
      href: '/invoices/new',
      label: 'Invoice',
      icon: FilePlus2,
      box: 'bg-red-500 hover:bg-red-600',
    },
    {
      href: '/expenses',
      label: 'Expenses',
      icon: Receipt,
      box: 'bg-yellow-400 hover:bg-yellow-500',
    },
    {
      href: '/receipts',
      label: 'Receipts',
      icon: BadgeCheck,
      box: 'bg-green-500 hover:bg-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business finances</p>
      </div>

      <div className="grid grid-cols-3 gap-3 lg:hidden">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex h-full flex-col items-center justify-center gap-2 rounded-xl px-2 py-4 text-center shadow-sm transition active:scale-95',
                link.box,
              )}
            >
              <Icon className="h-6 w-6 text-black" strokeWidth={2.25} />
              <span className="text-xs font-semibold text-black">{link.label}</span>
            </Link>
          );
        })}
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
    </div>
  );
}
