'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createVendorSchema, type CreateVendorInput, CURRENCIES } from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import type { Vendor } from '@/lib/api';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const vendorFormSchema = createVendorSchema.extend({
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

export type VendorFormInput = z.input<typeof vendorFormSchema>;

type Props = {
  businessCurrency: string;
  vendor?: Vendor;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CreateVendorInput) => void;
};

function addressValue(vendor: Vendor | undefined, key: keyof NonNullable<Vendor['address']>) {
  return vendor?.address?.[key] ?? '';
}

export function VendorForm({
  businessCurrency,
  vendor,
  loading = false,
  errorMessage,
  onSubmit,
}: Props) {
  const isEdit = Boolean(vendor);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorFormInput>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: vendor?.name ?? '',
      email: vendor?.email ?? '',
      phone: vendor?.phone ?? '',
      currency: vendor?.currency ?? businessCurrency,
      taxId: vendor?.taxId ?? '',
      notes: vendor?.notes ?? '',
      address: {
        line1: addressValue(vendor, 'line1'),
        line2: addressValue(vendor, 'line2'),
        city: addressValue(vendor, 'city'),
        state: addressValue(vendor, 'state'),
        postalCode: addressValue(vendor, 'postalCode'),
        country: addressValue(vendor, 'country'),
      },
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit vendor' : 'Vendor details'}</CardTitle>
        <CardDescription>
          Suppliers and sellers you buy from. Default currency is {businessCurrency}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data as CreateVendorInput))}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Supplier Co" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="orders@supplier.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+86 138 0000 0000" {...register('phone')} />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">TRN Number</Label>
              <Input
                id="taxId"
                placeholder="e.g. 100123456700003"
                {...register('taxId')}
              />
              <p className="text-xs text-muted-foreground">Tax Registration Number</p>
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
            <h3 className="font-medium">Address</h3>
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
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save vendor'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/vendors">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
