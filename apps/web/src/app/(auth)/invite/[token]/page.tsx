'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSession, signIn, useSession } from 'next-auth/react';
import {
  APP_NAME,
  ROLE_LABELS,
  registerSchema,
  type RegisterInput,
  type Role,
} from '@flowbooks/shared';
import { api, type InvitePreview } from '@/lib/api';
import { ORG_STORAGE_KEY } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthBrandFooter, AuthScreen } from '@/components/auth/auth-screen';

async function acceptAndGo(
  accessToken: string,
  inviteToken: string,
  router: ReturnType<typeof useRouter>,
) {
  const accepted = await api.invites.accept(accessToken, inviteToken);
  localStorage.setItem(ORG_STORAGE_KEY, accepted.organizationId);
  router.push('/dashboard');
  router.refresh();
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const router = useRouter();
  const { data: session, status } = useSession();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.invites
      .preview(token)
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        setValue('email', data.email);
        if (data.name) setValue('name', data.name);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Invite link is invalid or expired');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, setValue]);

  const onRegister = async (data: RegisterInput) => {
    setLoading(true);
    setError('');
    try {
      await api.auth.register({
        name: data.name,
        email: data.email,
        password: data.password,
        inviteToken: token,
      });
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (!result?.ok) {
        setError('Account created. Sign in to finish joining the team.');
        router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      const nextSession = await getSession();
      if (!nextSession?.accessToken) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
        return;
      }
      try {
        await acceptAndGo(nextSession.accessToken, token, router);
      } catch {
        const orgs = await api.organizations.list(nextSession.accessToken);
        const match = orgs.find((org) => org.id === preview?.organizationId);
        if (match) {
          localStorage.setItem(ORG_STORAGE_KEY, match.id);
          router.push('/dashboard');
          return;
        }
        throw new Error('Account created but joining the team failed. Open this invite link again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite');
    } finally {
      setLoading(false);
    }
  };

  const onAccept = async () => {
    if (!session?.accessToken) return;
    setAccepting(true);
    setError('');
    try {
      await acceptAndGo(session.accessToken, token, router);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite');
    } finally {
      setAccepting(false);
    }
  };

  if (loadError) {
    return (
      <AuthScreen title="Invite unavailable" subtitle="Ask the owner to send a new invite">
        <Card className="border-red-100 shadow-md">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button asChild className="w-full bg-red-600 hover:bg-red-700">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
        <AuthBrandFooter />
      </AuthScreen>
    );
  }

  if (!preview || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="h-40 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[preview.role as Role] ?? preview.role;
  const signedInEmail = session?.user?.email?.toLowerCase();
  const inviteEmail = preview.email.toLowerCase();
  const emailMatches = Boolean(signedInEmail && signedInEmail === inviteEmail);

  return (
    <AuthScreen
      title={`Join ${preview.organizationName}`}
      subtitle={`${preview.inviterName || 'A teammate'} invited you to ${APP_NAME}`}
    >
      <Card className="border-red-100 shadow-md">
        <CardHeader>
          <CardTitle>Team invite</CardTitle>
          <CardDescription>
            Role: {roleLabel}. Sign in at soloflow.practicalthings.store with your own email and
            password — you will see the same company dashboard as the owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'authenticated' && emailMatches ? (
            <>
              <p className="text-sm text-muted-foreground">
                Signed in as {session?.user?.email}. Accept to open {preview.organizationName}.
              </p>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={accepting}
                onClick={() => void onAccept()}
              >
                {accepting ? 'Joining…' : `Join ${preview.organizationName}`}
              </Button>
            </>
          ) : null}

          {status === 'authenticated' && !emailMatches ? (
            <>
              <p className="text-sm text-destructive">
                This invite was sent to {preview.email}. You are signed in as {session?.user?.email}.
                Sign out and use the invited email.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>
                  Sign in with {preview.email}
                </Link>
              </Button>
            </>
          ) : null}

          {status === 'unauthenticated' ? (
            <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" {...register('name')} />
                {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" readOnly {...register('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create a password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account and join'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
                  className="font-medium text-red-600 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          ) : null}
        </CardContent>
      </Card>
      <AuthBrandFooter />
    </AuthScreen>
  );
}
