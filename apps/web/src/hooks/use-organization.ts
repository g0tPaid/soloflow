'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { api, type Organization } from '@/lib/api';
import { DEFAULT_CURRENCY } from '@flowbooks/shared';

export const ORG_STORAGE_KEY = 'soloflow_org_id';
export const LEGACY_ORG_STORAGE_KEY = 'flowbooks_org_id';

export function useOrganizationId() {
  const { data: session, status } = useSession();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessCurrency = organization?.settings?.currency ?? DEFAULT_CURRENCY;

  useEffect(() => {
    if (status === 'loading') return;

    let cancelled = false;

    async function resolveOrganization() {
      const stored =
        localStorage.getItem(ORG_STORAGE_KEY) ?? localStorage.getItem(LEGACY_ORG_STORAGE_KEY);
      const token = session?.accessToken;

      if (!token) {
        if (!cancelled) {
          setOrganizationId(stored);
          setOrganization(null);
          setIsReady(true);
        }
        return;
      }

      try {
        const orgs = await api.organizations.list(token);
        if (cancelled) return;

        if (orgs.length === 0) {
          setOrganizationId(null);
          setOrganization(null);
          localStorage.removeItem(ORG_STORAGE_KEY);
          setError(null);
          setIsReady(true);
          return;
        }

        const match = stored ? orgs.find((org) => org.id === stored) : undefined;
        const active = match ?? orgs[0];
        localStorage.setItem(ORG_STORAGE_KEY, active.id);
        setOrganizationId(active.id);
        setOrganization(active as Organization);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setOrganizationId(stored);
          setOrganization(null);
          setError(err instanceof Error ? err.message : 'Failed to load organization');
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    void resolveOrganization();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, status]);

  return { organizationId, organization, businessCurrency, isReady, error, sessionStatus: status };
}
