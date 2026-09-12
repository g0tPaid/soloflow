'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useOrganizationId } from '@/hooks/use-organization';
import { SettingsNav } from '@/components/settings/settings-nav';
import { TeamSettings } from '@/components/settings/team-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TeamSettingsPage() {
  const { data: session } = useSession();
  const { organizationId, organization, isReady, error: orgError } = useOrganizationId();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SettingsNav />

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">No organization selected</p>
            <Link href="/onboarding" className="text-sm text-primary hover:underline">
              Create your organization →
            </Link>
          </CardContent>
        </Card>
      )}

      {orgError && (
        <Card className="border-destructive/50">
          <CardContent className="space-y-3 py-6">
            <p className="text-sm font-medium text-destructive">{orgError}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {organizationId && session?.accessToken && !orgError && (
        <TeamSettings
          token={session.accessToken}
          organizationId={organizationId}
          currentUserId={session.user?.id}
          currentRole={organization?.role}
        />
      )}
    </div>
  );
}
