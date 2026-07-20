'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Tell us a little more'),
});

type Values = z.infer<typeof schema>;

const faqs = [
  {
    id: 'shipping',
    q: 'Shipping',
    a: 'Orders ship within 2–4 business days. Domestic delivery typically 3–7 days. International available on select items.',
  },
  {
    id: 'returns',
    q: 'Returns',
    a: 'Unused items may be returned within 30 days in original condition. Final sale on personalized goods.',
  },
  {
    id: 'warranty',
    q: 'Warranty',
    a: 'Manufacturer warranties apply as listed on each product. We help coordinate repairs and replacements.',
  },
  {
    id: 'privacy',
    q: 'Privacy',
    a: 'We never sell personal data. Emails are used only for orders and optional newsletter updates.',
  },
  {
    id: 'terms',
    q: 'Terms',
    a: 'By shopping with us you agree to our standard terms of sale, including warranty and return policies above.',
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSent(true);
    reset();
  });

  return (
    <div className="container-pt py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Contact</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">We’re here</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Questions about materials, repairs, or orders — we usually reply within one business day.
        </p>
      </div>

      <div className="mt-14 grid gap-16 lg:grid-cols-2">
        <div>
          {sent ? (
            <p className="border border-border bg-card p-8 text-sm text-success" role="status">
              Message received. We’ll get back to you soon.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <Field label="Name" error={errors.name?.message}>
                <input
                  className="h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
                  {...register('name')}
                />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  className="h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
                  {...register('email')}
                />
              </Field>
              <Field label="Message" error={errors.message?.message}>
                <textarea
                  rows={6}
                  className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
                  {...register('message')}
                />
              </Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-8 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Email</p>
            <a href={`mailto:${SITE.email}`} className="mt-2 block hover:text-accent">
              {SITE.email}
            </a>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Location</p>
            <p className="mt-2 text-muted">New York, NY · Shipping worldwide</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Response time</p>
            <p className="mt-2 text-muted">Within 1 business day</p>
          </div>
        </div>
      </div>

      <section className="mt-24 border-t border-border pt-16">
        <h2 className="font-serif text-3xl">FAQ</h2>
        <dl className="mt-8 divide-y divide-border">
          {faqs.map((faq) => (
            <div key={faq.id} id={faq.id} className="scroll-mt-28 py-6">
              <dt className="font-medium">{faq.q}</dt>
              <dd className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
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
