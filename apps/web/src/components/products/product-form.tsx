'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createProductSchema,
  type CreateProductInput,
  CURRENCIES,
} from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadField } from '@/components/shared/image-upload-field';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/api';
import { z } from 'zod';

const productFormSchema = createProductSchema.extend({
  description: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  sku: z
    .string()
    .optional()
    .nullable()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

type ProductFormInput = z.input<typeof productFormSchema>;

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

type Props = {
  businessCurrency: string;
  product?: Product;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (data: CreateProductInput) => void;
};

export function ProductForm({
  businessCurrency,
  product,
  loading = false,
  errorMessage,
  onSubmit,
}: Props) {
  const isEdit = Boolean(product);
  const [imageUrl, setImageUrl] = useState<string | undefined>(product?.imageUrl ?? undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      sku: '',
      unitPrice: product ? Number(product.unitPrice) : 0,
      currency: product?.currency ?? businessCurrency,
      taxRate: 0,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit product' : 'Product details'}</CardTitle>
        <CardDescription>Add items you sell or bill for</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) =>
            onSubmit({
              ...(data as CreateProductInput),
              imageUrl: imageUrl ?? null,
            }),
          )}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" placeholder="Consulting hour" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <ImageUploadField value={imageUrl} onChange={setImageUrl} label="Product photo" />

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className={cn(
                'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
                'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              {...register('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select id="currency" className={selectClassName} {...register('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="unitPrice">Unit price</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="any"
                {...register('unitPrice', { valueAsNumber: true })}
              />
              {errors.unitPrice && (
                <p className="text-sm text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save changes' : 'Save product'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
