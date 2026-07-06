'use client';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Manage your customer relationships</p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Customer list will load from API. Use the sidebar to navigate modules.
      </div>
    </div>
  );
}
