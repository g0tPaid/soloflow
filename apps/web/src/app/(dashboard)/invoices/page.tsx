'use client';

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground">Create and manage invoices</p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Invoice management will load from API.
      </div>
    </div>
  );
}
