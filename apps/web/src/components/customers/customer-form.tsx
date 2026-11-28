'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, type CreateCustomerInput, CURRENCIES } from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { countries, resolveCountry } from '@/lib/countries';
import { z } from 'zod';
import type { Customer } from '@/lib/api';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const customerFormSchema = createCustomerSchema.extend({
  dropshipperNumber: z.string().optional(),
  dropshipperPrefix: z.string().optional(),
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
}).superRefine((data, context) => {
  if (!data.isDropshipper) return;
  if (!/^[0-9]{4}$/.test(data.dropshipperNumber ?? '')) {
    context.addIssue({
      code: 'custom',
      path: ['dropshipperNumber'],
      message: 'Enter a four-digit dropshipper number.',
    });
  }
  if (!/^[a-z0-9]{0,12}$/i.test(data.dropshipperPrefix ?? '')) {
    context.addIssue({ code: 'custom', path: ['dropshipperPrefix'], message: 'Use up to 12 letters or numbers.' });
  }
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;

type Props = {
  businessCurrency: string;
  customer?: Customer;
  suggestDropshipperNumber?: () => Promise<{ number: string | null }>;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CreateCustomerInput) => void;
  onCancel?: () => void;
  idPrefix?: string;
};

function addressValue(customer: Customer | undefined, key: keyof NonNullable<Customer['address']>) {
  return customer?.address?.[key] ?? '';
}

export function CustomerForm({
  businessCurrency,
  customer,
  suggestDropshipperNumber,
  loading = false,
  errorMessage,
  onSubmit,
  onCancel,
  idPrefix = '',
}: Props) {
  const isEdit = Boolean(customer);
  const [numberMessage, setNumberMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CustomerFormInput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      isDropshipper: customer?.isDropshipper === true,
      dropshipperNumber: customer?.dropshipperNumber ?? '',
      dropshipperPrefix: customer?.dropshipperPrefix ?? '',
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
        country: resolveCountry(addressValue(customer, 'country'))?.name ?? addressValue(customer, 'country'),
      },
    },
  });

  const isDropshipper = watch('isDropshipper');

  async function fillSuggestedNumber(checked: boolean) {
    if (!checked || getValues('dropshipperNumber') || !suggestDropshipperNumber) return;
    setNumberMessage('');
    try {
      const { number } = await suggestDropshipperNumber();
      if (!getValues('isDropshipper') || getValues('dropshipperNumber')) return;
      if (number) {
        setValue('dropshipperNumber', number, { shouldValidate: true });
      } else {
        setNumberMessage('All four-digit numbers are in use.');
      }
    } catch {
      setNumberMessage('Enter an available four-digit number.');
    }
  }

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
          onSubmit={handleSubmit((data) => {
            const { dropshipperNumber, dropshipperPrefix, ...fields } = data;
            onSubmit({
              ...fields,
              ...(data.isDropshipper ? { dropshipperNumber, dropshipperPrefix } : {}),
            } as CreateCustomerInput);
          })}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={idPrefix + 'name'}>Name *</Label>
              <Input id={idPrefix + 'name'} placeholder="Acme Corp" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium sm:col-span-2">
              <input type="checkbox" className="size-4 accent-[#E40046]" {...register('isDropshipper', { onChange: (event) => void fillSuggestedNumber(event.target.checked) })} />
              This customer is a dropshipper
            </label>
            {isDropshipper ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={idPrefix + 'dropshipperNumber'}>Dropshipper number *</Label>
                  <Input id={idPrefix + 'dropshipperNumber'} inputMode="numeric" pattern="[0-9]{4}" maxLength={4}
                    placeholder="0001" required aria-invalid={Boolean(errors.dropshipperNumber)}
                    {...register('dropshipperNumber')} />
                  <p className={errors.dropshipperNumber ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
                    {errors.dropshipperNumber?.message ?? (numberMessage || 'Four digits, including leading zeros.')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={idPrefix + 'dropshipperPrefix'}>ID prefix</Label>
                  <Input id={idPrefix + 'dropshipperPrefix'} maxLength={12} placeholder="AJ" {...register('dropshipperPrefix')} />
                  <p className={errors.dropshipperPrefix ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
                    {errors.dropshipperPrefix?.message ?? 'Optional letters or numbers.'}
                  </p>
                </div>
              </>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={idPrefix + 'email'}>Email</Label>
              <Input id={idPrefix + 'email'} type="email" placeholder="billing@acme.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={idPrefix + 'phone'}>Phone</Label>
              <Input id={idPrefix + 'phone'} placeholder="+91 98765 43210" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={idPrefix + 'currency'}>Currency</Label>
              <select id={idPrefix + 'currency'} className={selectClassName} {...register('currency')}>
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
              <Label htmlFor={idPrefix + 'taxId'}>TRN Number</Label>
              <Input
                id={idPrefix + 'taxId'}
                placeholder="Customer tax registration number"
                {...register('taxId')}
              />
              <p className="text-xs text-muted-foreground">
                Shown on invoices as TRN under the customer name.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={idPrefix + 'notes'}>Notes</Label>
              <textarea
                id={idPrefix + 'notes'}
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
                <Label htmlFor={idPrefix + 'address.city'}>City</Label>
                <Input id={idPrefix + 'address.city'} {...register('address.city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={idPrefix + 'address.state'}>State</Label>
                <Input id={idPrefix + 'address.state'} {...register('address.state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={idPrefix + 'address.postalCode'}>Postal code</Label>
                <Input id={idPrefix + 'address.postalCode'} {...register('address.postalCode')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={idPrefix + 'address.country'}>Country</Label>
                <select id={idPrefix + 'address.country'} className={selectClassName} {...register('address.country')}>
                  <option value="">Select a country</option>
                  {addressValue(customer, 'country') && !resolveCountry(addressValue(customer, 'country')) && <option value={addressValue(customer, 'country')}>{addressValue(customer, 'country')} (saved)</option>}
                  {countries.map(country => <option key={country.code} value={country.name}>{country.flag} {country.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save customer'}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
            ) : (
              <Button type="button" variant="outline" asChild>
                <Link href="/customers">Cancel</Link>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
