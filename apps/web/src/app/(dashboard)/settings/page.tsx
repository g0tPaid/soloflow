'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Building2 } from 'lucide-react';
import { api, type Organization } from '@/lib/api';
import { useOrganizationId } from '@/hooks/use-organization';
import { OrganizationSettingsForm } from '@/components/settings/organization-settings-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UpdateOrganizationInput } from '@flowbooks/shared';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { organizationId, organization, isReady, error: orgError } = useOrganizationId();
  const [orgData, setOrgData] = useState<Organization | null>(organization);

  useEffect(() => {
    if (organization) setOrgData(organization);
  }, [organization]);

  async function handleSave(data: UpdateOrganizationInput) {
    const updated = await api.organizations.update(
      session!.accessToken!,
      organizationId!,
      organizationId!,
      data,
    );
    setOrgData(updated);
    return updated;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium">Company Details — for your invoices</p>
              <p className="text-sm text-muted-foreground">
                Fill in the form below: logo, address, phone, email, and bank info. These show on
                every invoice PDF.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isReady && !organizationId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No organization selected</p>
            <Link href="/onboarding" className="text-primary hover:underline text-sm">
              Create your organization →
            </Link>
          </CardContent>
        </Card>
      )}

      {orgError && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 space-y-3">
            <p className="text-sm text-destructive font-medium">{orgError}</p>
            <p className="text-sm text-muted-foreground">
              1. Close any SoloFlow windows<br />
              2. Double-click <strong>START-SOLOFLOW.bat</strong> on your Desktop<br />
              3. Wait until the browser opens, then come back here
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!orgData && isReady && organizationId && !orgError && (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      )}

      {orgData && organizationId && !orgError && (
        <OrganizationSettingsForm
          key={orgData.id + (orgData.logo ?? '')}
          organization={orgData}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}
