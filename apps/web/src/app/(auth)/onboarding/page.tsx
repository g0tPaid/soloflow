'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
  CURRENCIES,
  COMMON_TIMEZONES,
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  APP_NAME,
} from '@flowbooks/shared';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { ORG_STORAGE_KEY } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadField } from '@/components/shared/image-upload-field';
import { cn } from '@/lib/utils';

const LOCAL_MODE = process.env.NEXT_PUBLIC_LOCAL_MODE === 'true';

const textareaClassName = cn(
  'flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
  'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      currency: DEFAULT_CURRENCY,
      timezone: DEFAULT_TIMEZONE,
      branding: {
        tagline: '',
        phone: '',
        email: '',
        website: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
      },
    },
  });

  const name = watch('name');

  useEffect(() => {
    if (status === 'loading') return;
    if (!LOCAL_MODE && status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [status, router]);

  useEffect(() => {
    if (!LOCAL_MODE || session?.accessToken || status === 'loading') return;

    let cancelled = false;
    async function connect() {
      setConnecting(true);
      setError('');
      try {
        const result = await signIn('local', { redirect: false });
        if (!cancelled && result?.error) {
          setError(
            'Cannot connect to SoloFlow. Make sure START-SOLOFLOW.bat is running and wait for the black window to finish starting.',
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            'Cannot connect to SoloFlow. Double-click START-SOLOFLOW.bat on your Desktop and wait until it opens the browser.',
          );
        }
      } finally {
        if (!cancelled) setConnecting(false);
      }
    }

    void connect();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, status]);

  const generateSlug = (n: string) => {
    const slug = n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
    return slug.length >= 2 ? slug : 'my-company';
  };

  async function resolveAccessToken(): Promise<string> {
    const freshSession = (await getSession()) ?? session;
    if (freshSession?.accessToken) return freshSession.accessToken;
    if (LOCAL_MODE) {
      const result = await api.auth.bootstrap();
      await signIn('local', { redirect: false });
      return result.token;
    }
    throw new Error('Your session expired. Please sign out and sign in again, then retry.');
  }

  const onSubmit = async (data: CreateOrganizationInput) => {
    setLoading(true);
    setError('');

    try {
      const token = await resolveAccessToken();
      const slug = data.slug?.trim() || generateSlug(data.name);
      const org = await api.organizations.create(token, {
        ...data,
        slug,
        logo: logo ?? null,
      });
      localStorage.setItem(ORG_STORAGE_KEY, org.id);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization';
      setError(message);
      setLoading(false);
    }
  };

  if (!ready || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="h-40 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl space-y-6"
      >
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg mb-4">
            SF
          </div>
          <h1 className="text-2xl font-semibold">Welcome to {APP_NAME}</h1>
          <p className="text-muted-foreground mt-1">
            Set up your company once — logo, address, and details go on every invoice.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company profile</CardTitle>
              <CardDescription>Your business name and logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploadField label="Company logo" value={logo} onChange={(url) => setLogo(url ?? null)} />

              <div className="space-y-2">
                <Label htmlFor="name">Company name *</Label>
                <Input
                  id="name"
                  placeholder="The Kerala Store"
                  {...register('name')}
                  onChange={(e) => {
                    register('name').onChange(e);
                    setValue('slug', generateSlug(e.target.value));
                  }}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (optional)</Label>
                <Input
                  id="tagline"
                  placeholder="Premium Kerala products"
                  {...register('branding.tagline')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    {...register('currency')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    {...register('timezone')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <input type="hidden" {...register('slug')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business address</CardTitle>
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
              <CardTitle>Contact & bank details</CardTitle>
              <CardDescription>Shown on your invoice PDFs</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('branding.phone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('branding.email')} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" {...register('branding.website')} />
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

          {!session?.accessToken && connecting && !error && (
            <p className="text-sm text-muted-foreground text-center">Connecting to SoloFlow…</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Setting up...' : connecting ? 'Connecting...' : 'Start using SoloFlow'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
