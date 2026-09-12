'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INVITABLE_ROLES,
  ROLE_LABELS,
  inviteMemberSchema,
  type InviteMemberInput,
  type Role,
} from '@flowbooks/shared';
import { Users } from 'lucide-react';
import { api, type InviteResult, type OrgMember, type PendingInvite } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const selectClassName = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

const HOSTED_LOGIN_URL = 'soloflow.practicalthings.store';

type Props = {
  token: string;
  organizationId: string;
  currentUserId?: string;
  currentRole?: string;
};

function canManage(role?: string) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function TeamSettings({ token, organizationId, currentUserId, currentRole }: Props) {
  const queryClient = useQueryClient();
  const teamKey = ['organization-members', organizationId];
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: teamKey,
    queryFn: () => api.organizations.members(token, organizationId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'EMPLOYEE', name: '', email: '' },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteMemberInput) =>
      api.organizations.invite(token, organizationId, {
        email: values.email,
        name: values.name?.trim() || undefined,
        role: values.role,
      }),
    onSuccess: (result) => {
      setInviteResult(result);
      setActionError('');
      reset({ role: 'EMPLOYEE', name: '', email: '' });
      void queryClient.invalidateQueries({ queryKey: teamKey });
    },
    onError: (err: Error) => {
      setInviteResult(null);
      setActionError(err.message);
    },
  });

  async function changeRole(member: OrgMember, role: Role) {
    if (role === member.role) return;
    setActionError('');
    try {
      await api.organizations.updateMemberRole(token, organizationId, member.id, {
        role: role as InviteMemberInput['role'],
      });
      void queryClient.invalidateQueries({ queryKey: teamKey });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not change role');
    }
  }

  async function removeMember(member: OrgMember) {
    if (!confirm(`Remove ${member.user.name || member.user.email} from this company?`)) return;
    setActionError('');
    try {
      await api.organizations.removeMember(token, organizationId, member.id);
      void queryClient.invalidateQueries({ queryKey: teamKey });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove member');
    }
  }

  async function cancelInvite(invite: PendingInvite) {
    setActionError('');
    try {
      await api.organizations.cancelInvite(token, organizationId, invite.id);
      void queryClient.invalidateQueries({ queryKey: teamKey });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel invite');
    }
  }

  const manage = canManage(currentRole);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium">Same company, each person has their own login</p>
            <p className="text-sm text-muted-foreground">
              Invite staff by email. Each person signs in at{' '}
              <span className="font-medium text-foreground">{HOSTED_LOGIN_URL}</span> with their
              own email and password. Owner and staff can use this dashboard at the same time from
              different computers.
            </p>
          </div>
        </CardContent>
      </Card>

      {manage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>
              They join this organization — invoices, customers, and reports stay shared.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((values) => inviteMutation.mutate(values))}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  placeholder="staff@company.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-name">Name</Label>
                <Input id="invite-name" placeholder="Optional" {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <select id="invite-role" className={selectClassName} {...register('role')}>
                  {INVITABLE_ROLES.filter((role) => currentRole === 'OWNER' || role !== 'ADMIN').map(
                    (role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Inviting…' : 'Invite'}
                </Button>
              </div>
            </form>

            {inviteResult ? <InviteResultBanner result={inviteResult} /> : null}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the owner or an admin can invite or remove people.
        </p>
      )}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {data
              ? `${data.seatCount} of ${data.seatLimit} seats used (members + pending invites)`
              : 'People who can open this company dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="h-32 animate-pulse rounded-lg bg-muted" /> : null}
          {error ? (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load team'}
            </p>
          ) : null}
          {data ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Email</th>
                    <th className="pb-2 pr-3 font-medium">Role</th>
                    {manage ? <th className="pb-2 font-medium"> </th> : null}
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member) => {
                    const isSelf = member.user.id === currentUserId;
                    const locked = member.role === 'OWNER' || isSelf || !manage;
                    return (
                      <tr key={member.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-medium">{member.user.name || '—'}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{member.user.email}</td>
                        <td className="py-3 pr-3">
                          {locked ? (
                            <span>{ROLE_LABELS[member.role] ?? member.role}</span>
                          ) : (
                            <select
                              className={selectClassName}
                              value={member.role}
                              onChange={(event) =>
                                void changeRole(member, event.target.value as Role)
                              }
                            >
                              {INVITABLE_ROLES.filter(
                                (role) => currentRole === 'OWNER' || role !== 'ADMIN',
                              ).map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        {manage ? (
                          <td className="py-3 text-right">
                            {isSelf || member.role === 'OWNER' ? null : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => void removeMember(member)}
                              >
                                Remove
                              </Button>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {data && data.pendingInvites.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>Waiting for the person to create their account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {invite.name || invite.email}{' '}
                    <span className="font-normal text-muted-foreground">
                      · {ROLE_LABELS[invite.role] ?? invite.role}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{invite.email}</p>
                </div>
                {manage ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void cancelInvite(invite)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function InviteResultBanner({ result }: { result: InviteResult }) {
  if (result.status === 'added') {
    return (
      <p className="mt-4 text-sm text-green-700">
        Added to the team. They can sign in at {HOSTED_LOGIN_URL} with their existing password.
      </p>
    );
  }

  if (result.status === 'created' && result.temporaryPassword) {
    return (
      <div className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-medium text-amber-950">Account created — share these login details</p>
        <p className="text-amber-950">
          Email: <span className="font-mono">{result.member?.user.email}</span>
        </p>
        <p className="text-amber-950">
          Temporary password:{' '}
          <span className="font-mono">{result.temporaryPassword}</span>
        </p>
        <p className="text-amber-900">
          They sign in at {HOSTED_LOGIN_URL} and can change the password from Forgot password.
          Email delivery is not configured on this server, so copy this password now.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <p className="font-medium text-emerald-900">
        {result.emailDelivered
          ? 'Invite email sent.'
          : 'Invite created. Share this link if they do not get the email:'}
      </p>
      {result.inviteUrl ? (
        <p className="break-all font-mono text-xs text-emerald-950">{result.inviteUrl}</p>
      ) : null}
      <p className="text-emerald-900">
        They create their own password, then sign in at {HOSTED_LOGIN_URL}.
      </p>
    </div>
  );
}
