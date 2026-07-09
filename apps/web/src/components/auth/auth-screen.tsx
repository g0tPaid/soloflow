'use client';

import type { ReactNode } from 'react';
import { APP_NAME } from '@flowbooks/shared';

export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 via-background to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-500/30">
            SF
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthBrandFooter() {
  return (
    <p className="mt-6 text-center text-xs text-muted-foreground">
      {APP_NAME} · Invoices, expenses & receipts
    </p>
  );
}
