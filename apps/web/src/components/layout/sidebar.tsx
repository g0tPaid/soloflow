'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  BadgeCheck,
  Landmark,
  BarChart3,
  Wallet,
  Boxes,
  FolderKanban,
  Contact,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ArrowLeft,
} from 'lucide-react';
import { NAV_MODULES } from '@flowbooks/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  customers: Users,
  products: Package,
  invoices: FileText,
  expenses: Receipt,
  receipts: BadgeCheck,
  banking: Landmark,
  reports: BarChart3,
  payroll: Wallet,
  inventory: Boxes,
  projects: FolderKanban,
  crm: Contact,
  settings: Settings,
};

function SidebarDesktop({ organizationName }: { organizationName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push('/login');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
          SF
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{APP_NAME}</span>
            {organizationName && (
              <span className="max-w-[140px] truncate text-xs text-muted-foreground">{organizationName}</span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_MODULES.map((item) => {
          const Icon = iconMap[item.key] || LayoutDashboard;
          const isActive = pathname.startsWith(item.href);
          const isDisabled = !item.enabled;

          if (isDisabled) {
            return (
              <div
                key={item.key}
                className={cn(
                  'flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50',
                  collapsed && 'justify-center px-2',
                )}
                title="Coming soon"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Soon</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                collapsed && 'justify-center px-2',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-2')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
            collapsed && 'justify-center px-2',
          )}
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </div>
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const isHome = pathname === '/dashboard';

  if (isHome) {
    return (
      <header className="sticky top-0 z-30 min-h-[max(0.75rem,env(safe-area-inset-top))] bg-background lg:ml-60 lg:min-h-14 lg:border-b" />
    );
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b bg-background/95 backdrop-blur px-3 pt-[env(safe-area-inset-top)] lg:px-6 lg:ml-60 lg:pt-0">
      <Button variant="ghost" size="sm" className="shrink-0 gap-1 px-2 lg:hidden" asChild>
        <Link href="/dashboard" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
      </Button>
    </header>
  );
}

export function AppShell({ children, organizationName }: { children: React.ReactNode; organizationName?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex',
        )}
      >
        <SidebarDesktop organizationName={organizationName} />
      </aside>
      <div className="lg:ml-60">
        <TopBar />
        <main className="p-4 pb-6 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

/** @deprecated Mobile sidebar removed — desktop sidebar only */
export function Sidebar(props: { organizationName?: string; mobileOpen?: boolean; setMobileOpen?: (open: boolean) => void }) {
  return <SidebarDesktop organizationName={props.organizationName} />;
}
