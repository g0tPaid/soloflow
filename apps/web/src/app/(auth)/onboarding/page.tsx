'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrganizationSchema, type CreateOrganizationInput } from '@flowbooks/shared';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { currency: 'USD', timezone: 'UTC' },
  });

  const name = watch('name');
  const generateSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const onSubmit = async (data: CreateOrganizationInput) => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const org = await api.organizations.create(session.accessToken, data) as { id: string };
      localStorage.setItem('flowbooks_org_id', org.id);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold">Set up your organization</h1>
          <p className="text-muted-foreground mt-1">Tell us about your business to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>This will be your workspace for all accounting activities</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization name</Label>
                <Input
                  id="name"
                  placeholder="Acme Inc"
                  {...register('name')}
                  onChange={(e) => {
                    register('name').onChange(e);
                    setValue('slug', generateSlug(e.target.value));
                  }}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL slug</Label>
                <Input id="slug" placeholder="acme-inc" {...register('slug')} />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" placeholder="USD" {...register('currency')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" placeholder="UTC" {...register('timezone')} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create organization'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
