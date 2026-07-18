'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadField } from '@/components/shared/image-upload-field';
import { updateOrganizationSchema, type UpdateOrganizationInput, parseFxRates, CURRENCIES } from '@flowbooks/shared';
import {
  DEFAULT_INVOICE_ACCENT,
  INVOICE_ACCENT_PRESETS,
  normalizeInvoiceAccent,
  parseBranding,
} from '@/lib/organization-branding';
import type { Organization } from '@/lib/api';
import { cn } from '@/lib/utils';

const textareaClassName = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

type Props = {
  organization: Organization;
  onSubmit: (data: UpdateOrganizationInput) => Promise<void>;
};

export function OrganizationSettingsForm({ organization, onSubmit }: Props) {
  const branding = parseBranding(organization.settings?.branding);
  const initialFx = parseFxRates(organization.settings?.fxRates);
  const [logo, setLogo] = useState<string | null | undefined>(organization.logo);
  const [invoiceSignature, setInvoiceSignature] = useState<string | null | undefined>(
    branding.invoiceSignature ?? null,
  );
  const [invoiceOffers, setInvoiceOffers] = useState<(string | null)[]>([
    branding.invoiceOffer1 ?? null,
    branding.invoiceOffer2 ?? null,
    branding.invoiceOffer3 ?? null,
    branding.invoiceOffer4 ?? null,
  ]);
  const [invoiceAccent, setInvoiceAccent] = useState(
    normalizeInvoiceAccent(branding.invoiceAccent),
  );
  const [costCurrency, setCostCurrency] = useState(
    (organization.settings?.costCurrency || 'CNY').toUpperCase(),
  );
  const [cnyPerUsd, setCnyPerUsd] = useState(String(initialFx.CNY ?? 7.25));
  const [eurPerUsd, setEurPerUsd] = useState(String(initialFx.EUR ?? 0.92));
  const [costRatePerUsd, setCostRatePerUsd] = useState(() => {
    const code = (organization.settings?.costCurrency || 'CNY').toUpperCase();
    if (code === 'USD') return '1';
    return String(initialFx[code] ?? 1);
  });
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
      const cny = Math.max(0.0001, Number(cnyPerUsd) || 7.25);
      const eur = Math.max(0.0001, Number(eurPerUsd) || 0.92);
      const entryCode = costCurrency.toUpperCase();
      const fxRates: Record<string, number> = {
        USD: 1,
        CNY: cny,
        EUR: eur,
      };
      if (entryCode !== 'USD' && entryCode !== 'CNY' && entryCode !== 'EUR') {
        fxRates[entryCode] = Math.max(0.0001, Number(costRatePerUsd) || 1);
      } else if (entryCode === 'CNY') {
        fxRates.CNY = cny;
      } else if (entryCode === 'EUR') {
        fxRates.EUR = eur;
      }
      await onSubmit({
        name: data.name,
        logo: logo ?? null,
        branding: {
          ...data.branding,
          invoiceSignature: invoiceSignature ?? '',
          invoiceOffer1: invoiceOffers[0] ?? '',
          invoiceOffer2: invoiceOffers[1] ?? '',
          invoiceOffer3: invoiceOffers[2] ?? '',
          invoiceOffer4: invoiceOffers[3] ?? '',
          invoiceBanner: '',
          invoiceAccent: normalizeInvoiceAccent(invoiceAccent),
        },
        costCurrency: entryCode,
        fxRates,
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
          <CardTitle>Invoice accent color</CardTitle>
          <CardDescription>
            Used for waves, headings, table headers, and totals on printed invoices and PDFs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {INVOICE_ACCENT_PRESETS.map((preset) => {
              const selected = invoiceAccent.toUpperCase() === preset.value.toUpperCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setInvoiceAccent(preset.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                    selected
                      ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                      : 'border-input hover:bg-muted/40',
                  )}
                  aria-pressed={selected}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.value }}
                    aria-hidden
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="invoiceAccentPicker">Custom color</Label>
              <input
                id="invoiceAccentPicker"
                type="color"
                value={invoiceAccent}
                onChange={(e) => setInvoiceAccent(normalizeInvoiceAccent(e.target.value))}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceAccentHex">Hex</Label>
              <Input
                id="invoiceAccentHex"
                value={invoiceAccent}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(next) || /^[0-9A-Fa-f]{0,6}$/.test(next)) {
                    setInvoiceAccent(next.startsWith('#') ? next : `#${next}`);
                  }
                }}
                onBlur={() => setInvoiceAccent(normalizeInvoiceAccent(invoiceAccent))}
                className="w-32 font-mono uppercase"
                maxLength={7}
                placeholder={DEFAULT_INVOICE_ACCENT}
              />
            </div>
            <div
              className="mb-0.5 flex h-10 min-w-[140px] items-center justify-center rounded-md px-4 text-sm font-semibold text-white shadow-sm"
              style={{ backgroundColor: normalizeInvoiceAccent(invoiceAccent) }}
            >
              Preview
            </div>
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
          <CardTitle>Expense cost currency</CardTitle>
          <CardDescription>
            Staff enter purchase and shipping costs in this currency on the Expenses page. Amounts
            convert to each invoice&apos;s sale currency using your exchange rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="costCurrency">Cost entry currency</Label>
            <select
              id="costCurrency"
              className={selectClassName}
              value={costCurrency}
              onChange={(e) => {
                const next = e.target.value.toUpperCase();
                setCostCurrency(next);
                if (next === 'USD') setCostRatePerUsd('1');
                else if (next === 'CNY') setCostRatePerUsd(cnyPerUsd);
                else if (next === 'EUR') setCostRatePerUsd(eurPerUsd);
                else setCostRatePerUsd(String(initialFx[next] ?? 1));
              }}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exchange rates (USD base)</CardTitle>
          <CardDescription>
            Dashboard totals convert everything to USD (with CNY shown underneath). Expense costs in
            your cost entry currency use these rates. Enter how many units equal <strong>1 USD</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cnyPerUsd">CNY per 1 USD</Label>
            <Input
              id="cnyPerUsd"
              type="number"
              min="0.0001"
              step="any"
              value={cnyPerUsd}
              onChange={(e) => {
                setCnyPerUsd(e.target.value);
                if (costCurrency === 'CNY') setCostRatePerUsd(e.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">Default 7.25 · also used on the dashboard</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eurPerUsd">EUR per 1 USD</Label>
            <Input
              id="eurPerUsd"
              type="number"
              min="0.0001"
              step="any"
              value={eurPerUsd}
              onChange={(e) => {
                setEurPerUsd(e.target.value);
                if (costCurrency === 'EUR') setCostRatePerUsd(e.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">Default 0.92 (1 USD ≈ 0.92 EUR)</p>
          </div>
          {costCurrency !== 'USD' && costCurrency !== 'CNY' && costCurrency !== 'EUR' && (
            <div className="space-y-2 sm:col-span-2 max-w-sm">
              <Label htmlFor="costRatePerUsd">{costCurrency} per 1 USD</Label>
              <Input
                id="costRatePerUsd"
                type="number"
                min="0.0001"
                step="any"
                value={costRatePerUsd}
                onChange={(e) => setCostRatePerUsd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for converting {costCurrency} expense costs
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New Offers (4 images)</CardTitle>
          <CardDescription>
            Shown under &quot;New Offers&quot; on invoices as four sharp <strong>300×300</strong> boxes.
            Each photo is resized to 300×300 on upload so Save works (avoids the 10MB JSON error).
            Click <strong>Save company details</strong> after uploading.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <ImageUploadField
              key={index}
              label={`Offer ${index + 1}`}
              variant="signature"
              value={invoiceOffers[index]}
              onChange={(url) =>
                setInvoiceOffers((prev) => {
                  const next = [...prev];
                  next[index] = url ?? null;
                  return next;
                })
              }
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Official signature / company stamp</CardTitle>
          <CardDescription>
            Shown as a <strong>300×300</strong> image on the left of the invoice Subtotal.
            Upload your stamp/signature PNG, then click <strong>Save company details</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            label="Signature & stamp"
            variant="signature"
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
