'use client';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your product catalog</p>
      </div>
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Product catalog will load from API.
      </div>
    </div>
  );
}
