'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  title: z.string().min(3, 'Add a short title'),
  details: z.string().min(20, 'Share at least 20 characters'),
  link: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

type FormValues = z.infer<typeof schema>;

const forms = [
  {
    id: 'submit-product',
    eyebrow: 'Submit a product',
    title: 'Nominate something built to last',
    description:
      'Tell us what you own, how long you have used it, what has failed, and whether parts or service are available.',
    titleLabel: 'Product name',
    detailsLabel: 'Why should we review it?',
    success: 'Thank you. We will research the product before it appears anywhere on the site.',
  },
  {
    id: 'repair-story',
    eyebrow: 'Repair story',
    title: 'Show us what repair saved',
    description:
      'Share a resole, rebuild, reseasoning, replacement part, warranty experience, or local craftsperson worth knowing.',
    titleLabel: 'Repair title',
    detailsLabel: 'What broke, what fixed it, and what did it cost?',
    success: 'Story received. Repair evidence helps other owners keep good things in service.',
  },
  {
    id: 'ownership-photos',
    eyebrow: 'Ownership photos',
    title: 'Document patina, wear, and real use',
    description:
      'We value honest photographs more than pristine launches. Link to images that show how a product ages.',
    titleLabel: 'Object photographed',
    detailsLabel: 'What should we notice in the photos?',
    success: 'Photos noted. We will review them for future product and guide updates.',
  },
  {
    id: 'vote-suggest',
    eyebrow: 'Vote or suggest',
    title: 'Help decide what we test next',
    description:
      'Request a category, challenge a recommendation, or tell us which everyday object deserves a better guide.',
    titleLabel: 'Suggestion',
    detailsLabel: 'What should we investigate and why?',
    success: 'Suggestion saved for the editorial queue.',
  },
];

export function CommunityForms() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {forms.map((form) => (
        <CommunityFormCard key={form.id} form={form} />
      ))}
    </div>
  );
}

function CommunityFormCard({ form }: { form: (typeof forms)[number] }) {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', title: '', details: '', link: '' },
  });

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitted(true);
    reset();
  });

  return (
    <section id={form.id} className="border border-border bg-card p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.22em] text-accent">{form.eyebrow}</p>
      <h2 className="mt-3 font-serif text-3xl">{form.title}</h2>
      <p className="mt-4 text-sm leading-7 text-muted">{form.description}</p>

      {submitted ? (
        <div className="mt-8 border border-accent/30 bg-accent/5 p-5" role="status">
          <p className="text-sm leading-7 text-success">{form.success}</p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 text-xs uppercase tracking-[0.18em] text-foreground underline underline-offset-4"
          >
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <Field label={form.titleLabel} error={errors.title?.message}>
            <input
              className="h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
              {...register('title')}
            />
          </Field>

          <Field label={form.detailsLabel} error={errors.details?.message}>
            <textarea
              rows={5}
              className="w-full resize-none border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
              {...register('details')}
            />
          </Field>

          <Field label="Optional link to photos, product, or repair notes" error={errors.link?.message}>
            <input
              type="url"
              placeholder="https://"
              className="h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
              {...register('link')}
            />
          </Field>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send submission'}
          </Button>
        </form>
      )}
    </section>
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
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error && <span className="mt-2 block text-xs text-error">{error}</span>}
    </label>
  );
}
