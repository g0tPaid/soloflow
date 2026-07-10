'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadField } from '@/components/shared/image-upload-field';
import { INVOICE_BANNER_SIZE, updateOrganizationSchema, type UpdateOrganizationInput } from '@flowbooks/shared';
import { parseBranding } from '@/lib/organization-branding';
import type { Organization } from '@/lib/api';
import { cn } from '@/lib/utils';

const textareaClassName = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

type Props = {
  organization: Organization;
  onSubmit: (data: UpdateOrganizationInput) => Promise<void>;
};

export function OrganizationSettingsForm({ organization, onSubmit }: Props) {
  const branding = parseBranding(organization.settings?.branding);
  const [logo, setLogo] = useState<string | null | undefined>(organization.logo);
  const [invoiceBanner, setInvoiceBanner] = useState<string | null | undefined>(
    branding.invoiceBanner ?? null,
  );
  const [invoiceSignature, setInvoiceSignature] = useState<string | null | undefined>(
    branding.invoiceSignature ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      branding: {
        tagline: branding.tagline ?? '',
        phone: branding.phone ?? '',
        email: branding.email ?? '',
        website: branding.website ?? '',
        instagramUrl: branding.instagramUrl ?? 'https://www.instagram.com/sevencolortrading/',
        bankName: branding.bankName ?? '',
        accountName: branding.accountName ?? '',
        accountNumber: branding.accountNumber ?? '',
        address: {
          line1: branding.address?.line1 ?? '',
          line2: branding.address?.line2 ?? '',
          city: branding.address?.city ?? '',
          state: branding.address?.state ?? '',
          postalCode: branding.address?.postalCode ?? '',
          country: branding.address?.country ?? '',
        },
      },
    },
  });

  async function handleSave(data: UpdateOrganizationInput) {
    setSubmitting(true);
    setError('');
    setSaved(false);
    try {
      await onSubmit({
        name: data.name,
        logo: logo ?? null,
        branding: {
          ...data.branding,
          invoiceBanner: invoiceBanner ?? undefined,
          invoiceSignature: invoiceSignature ?? undefined,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>
            This information appears on your invoices — logo, name, and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUploadField
            label="Company logo"
            value={logo}
            onChange={(url) => setLogo(url ?? null)}
          />

          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline (optional)</Label>
            <Input
              id="tagline"
              placeholder="e.g. Premium Kerala Products"
              {...register('branding.tagline')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business address</CardTitle>
          <CardDescription>Shown on invoices as your company address</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line1">Address line 1</Label>
            <Input id="line1" {...register('branding.address.line1')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="line2">Address line 2</Label>
            <Input id="line2" {...register('branding.address.line2')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('branding.address.city')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register('branding.address.state')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" {...register('branding.address.postalCode')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register('branding.address.country')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice promotional banner</CardTitle>
          <CardDescription>
            Shown at the bottom of invoice PDFs under &quot;New Offers&quot;. Upload the image, then click{' '}
            <strong>Save company details</strong> at the bottom of this page.
            Use a sharp PNG/JPG (recommended <strong>{INVOICE_BANNER_SIZE.label}</strong> or larger).
            If an old banner looks blurry, re-upload it — older saves were compressed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            label="Offer banner"
            variant="banner"
            value={invoiceBanner}
            onChange={(url) => setInvoiceBanner(url ?? null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Official signature / company stamp</CardTitle>
          <CardDescription>
            Shown on the left of the invoice totals (next to Subtotal). Upload your stamp and signature
            image as one PNG with a transparent background, then click{' '}
            <strong>Save company details</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            label="Signature & stamp"
            variant="banner"
            value={invoiceSignature}
            onChange={(url) => setInvoiceSignature(url ?? null)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & bank details</CardTitle>
          <CardDescription>Phone, email, website, and bank info for invoices</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="+91 98765 43210" {...register('branding.phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('branding.email')} />
            {errors.branding?.email && (
              <p className="text-sm text-destructive">{errors.branding.email.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="www.yourcompany.com" {...register('branding.website')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="instagramUrl">Instagram page (QR code on invoices)</Label>
            <Input
              id="instagramUrl"
              placeholder="https://www.instagram.com/sevencolortrading/"
              {...register('branding.instagramUrl')}
            />
            <p className="text-xs text-muted-foreground">
              A stylish QR code for this link appears on the top-right of invoice PDFs
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank name</Label>
            <Input id="bankName" {...register('branding.bankName')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountName">Account name</Label>
            <Input id="accountName" {...register('branding.accountName')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input id="accountNumber" {...register('branding.accountNumber')} />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Company details saved. They will appear on new invoice PDFs.</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Save company details'}
      </Button>
    </form>
  );
}
