'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '@/lib/store';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  line1: z.string().min(3),
  city: z.string().min(2),
  postal: z.string().min(3),
  country: z.string().min(2),
  coupon: z.string().optional(),
});

type Values = z.infer<typeof schema>;

const fieldClass =
  'h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground';

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [placed, setPlaced] = useState(false);
  const total = subtotal();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'United States' },
  });

  if (placed) {
    return (
      <div className="container-pt py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Order confirmed</p>
        <h1 className="mt-4 font-serif text-5xl">Thank you</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          Your order is being prepared. A confirmation will arrive by email shortly.
        </p>
        <Link href="/shop" className="mt-10 inline-block">
          <Button>Continue shopping</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-pt py-24 text-center">
        <h1 className="font-serif text-4xl">Your cart is empty</h1>
        <Link href="/shop" className="mt-8 inline-block">
          <Button>Shop collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-pt grid gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <div>
        <h1 className="font-serif text-4xl md:text-5xl">Checkout</h1>
        <p className="mt-3 text-sm text-muted">Minimal. Fast. Trust-focused.</p>
        <form
          className="mt-10 space-y-5"
          onSubmit={handleSubmit(async () => {
            await new Promise((r) => setTimeout(r, 700));
            clear();
            setPlaced(true);
          })}
        >
          <Field label="Email" error={errors.email?.message}>
            <input className={fieldClass} {...register('email')} />
          </Field>
          <Field label="Full name" error={errors.name?.message}>
            <input className={fieldClass} {...register('name')} />
          </Field>
          <Field label="Address" error={errors.line1?.message}>
            <input className={fieldClass} {...register('line1')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" error={errors.city?.message}>
              <input className={fieldClass} {...register('city')} />
            </Field>
            <Field label="Postal code" error={errors.postal?.message}>
              <input className={fieldClass} {...register('postal')} />
            </Field>
          </div>
          <Field label="Country" error={errors.country?.message}>
            <input className={fieldClass} {...register('country')} />
          </Field>
          <Field label="Coupon (optional)">
            <input className={fieldClass} placeholder="Code" {...register('coupon')} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Placing order…' : `Pay ${formatPrice(total)}`}
          </Button>
          <p className="text-xs text-muted">
            Demo checkout — connect Shopify Checkout or a payments provider for production.
          </p>
        </form>
      </div>

      <aside className="border border-border bg-card p-6 md:p-8 lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={`${item.productId}-${item.variantId}`}
              className="flex justify-between gap-4 text-sm"
            >
              <span>
                {item.title}
                <span className="block text-xs text-muted">
                  {item.variantTitle} × {item.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">Shipping calculated after address entry.</p>
      </aside>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
      {error && <span className="mt-2 block text-xs text-error">{error}</span>}
    </label>
  );
}
