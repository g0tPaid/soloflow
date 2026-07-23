'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, type CreateCustomerInput, CURRENCIES } from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import type { Customer } from '@/lib/api';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const customerFormSchema = createCustomerSchema.extend({
  email: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Invalid email address',
    }),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  taxId: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  notes: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;

type Props = {
  businessCurrency: string;
  customer?: Customer;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CreateCustomerInput) => void;
};

function addressValue(customer: Customer | undefined, key: keyof NonNullable<Customer['address']>) {
  return customer?.address?.[key] ?? '';
}

export function CustomerForm({
  businessCurrency,
  customer,
  loading = false,
  errorMessage,
  onSubmit,
}: Props) {
  const isEdit = Boolean(customer);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      currency: customer?.currency ?? businessCurrency,
      taxId: customer?.taxId ?? '',
      notes: customer?.notes ?? '',
      address: {
        line1: addressValue(customer, 'line1'),
        line2: addressValue(customer, 'line2'),
        city: addressValue(customer, 'city'),
        state: addressValue(customer, 'state'),
        postalCode: addressValue(customer, 'postalCode'),
        country: addressValue(customer, 'country'),
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit customer' : 'Customer details'}</CardTitle>
        <CardDescription>
          Choose a currency for this customer. Default is {businessCurrency}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data as CreateCustomerInput))}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Acme Corp" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="billing@acme.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select id="currency" className={selectClassName} {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Default is {businessCurrency}. You can change it per customer.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">TRN Number</Label>
              <Input
                id="taxId"
                placeholder="Customer tax registration number"
                {...register('taxId')}
              />
              <p className="text-xs text-muted-foreground">
                Shown on invoices as TRN under the customer name.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                rows={3}
                className={cn(
                  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                {...register('notes')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Billing address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address.line1">Address line 1</Label>
                <Input id="address.line1" {...register('address.line1')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address.line2">Address line 2</Label>
                <Input id="address.line2" {...register('address.line2')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.city">City</Label>
                <Input id="address.city" {...register('address.city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.state">State</Label>
                <Input id="address.state" {...register('address.state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.postalCode">Postal code</Label>
                <Input id="address.postalCode" {...register('address.postalCode')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address.country">Country</Label>
                <Input id="address.country" {...register('address.country')} />
              </div>
            </div>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save customer'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/customers">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
