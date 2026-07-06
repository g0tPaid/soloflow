'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  Landmark,
  BarChart3,
  Wallet,
  Boxes,
  FolderKanban,
  Contact,
  Settings,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { NAV_MODULES, APP_NAME } from '@flowbooks/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  customers: Users,
  products: Package,
  invoices: FileText,
  expenses: Receipt,
  banking: Landmark,
  reports: BarChart3,
  payroll: Wallet,
  inventory: Boxes,
  projects: FolderKanban,
  crm: Contact,
  settings: Settings,
};

interface SidebarProps {
  organizationName?: string;
}

export function Sidebar({ organizationName }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          FB
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{APP_NAME}</span>
            {organizationName && (
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{organizationName}</span>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto hidden lg:flex h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV_MODULES.map((item) => {
          const Icon = iconMap[item.key] || LayoutDashboard;
          const isActive = pathname.startsWith(item.href);
          const isDisabled = !item.enabled;

          if (isDisabled) {
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed',
                  collapsed && 'justify-center px-2',
                )}
                title="Coming soon"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Soon</span>
                  </>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
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

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-2')}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6 lg:ml-60">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search customers, invoices, products..."
            className="w-full h-9 rounded-md border border-input bg-muted/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded hidden sm:block">
            ⌘K
          </span>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children, organizationName }: { children: React.ReactNode; organizationName?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar organizationName={organizationName} />
      <div className="lg:ml-60">
        <TopBar />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-4 lg:p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
