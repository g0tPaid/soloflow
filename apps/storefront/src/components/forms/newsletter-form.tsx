'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

type FormValues = z.infer<typeof schema>;

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async () => {
    await new Promise((r) => setTimeout(r, 500));
    setDone(true);
    reset();
  });

  if (done) {
    return (
      <p className="text-sm text-success" role="status">
        You’re on the list. Own less. Own better.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={compact ? 'flex gap-2' : 'space-y-3'}>
      <div className={compact ? 'flex-1' : ''}>
        <label htmlFor="newsletter-email" className="sr-only">
          Email
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Email address"
          className="h-12 w-full border border-border bg-background px-4 text-sm outline-none focus:border-foreground"
          {...register('email')}
        />
        {errors.email && (
          <p className="mt-2 text-xs text-error">{errors.email.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className={compact ? '' : 'w-full sm:w-auto'}>
        {isSubmitting ? 'Joining…' : 'Subscribe'}
      </Button>
    </form>
  );
}
