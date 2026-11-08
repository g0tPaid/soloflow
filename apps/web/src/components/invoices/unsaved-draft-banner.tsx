'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  NEW_DOCUMENT_DRAFT_ID,
  type FormDraftKind,
  type FormDraftScope,
} from '@/lib/form-draft/model';
import { getFormDraftRepository, type FormDraftRepository } from '@/lib/form-draft/repository';
import type { FormDraftSnapshot } from '@/lib/form-draft/model';

function formatDraftTime(savedAt: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(savedAt));
  } catch {
    return new Date(savedAt).toLocaleString();
  }
}

export function UnsavedDraftBanner({
  kind,
  userId,
  organizationId,
  repository,
}: {
  kind: FormDraftKind;
  userId: string;
  organizationId: string;
  repository?: FormDraftRepository;
}) {
  const scope: FormDraftScope = {
    userId,
    organizationId,
    kind,
    documentId: NEW_DOCUMENT_DRAFT_ID,
  };
  const store = repository ?? getFormDraftRepository();
  const [snapshot, setSnapshot] = useState<FormDraftSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store
      .read(scope)
      .then((stored) => {
        if (!cancelled) setSnapshot(stored);
      })
      .catch(() => {
        if (!cancelled) setError('Could not read the unsaved draft on this device.');
      });
    return () => {
      cancelled = true;
    };
    // The scope identity is the four fields above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, userId, organizationId, store]);

  if (!snapshot && !error) return null;

  const noun = kind === 'invoice' ? 'invoice' : 'quote';
  const href = kind === 'invoice' ? '/invoices/new' : '/quotes/new';

  async function discard() {
    const confirmed = window.confirm(
      `Discard the unsaved ${noun}? This removes it from this device and cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await store.remove(scope);
      setSnapshot(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard the draft. It is still on this device.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-[#E40046]/30 bg-[#E40046]/5 px-3 py-3 text-sm" aria-live="polite">
      {snapshot ? (
        <>
          <p>
            Unsaved {noun} from {formatDraftTime(snapshot.savedAt)}. It is stored on this device and has not been
            submitted.
          </p>
          {snapshot.imagesOmitted ? (
            <p className="mt-1 text-muted-foreground">Photos were too large to keep in that draft.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-[#E40046] text-white hover:bg-[#c4003c]">
              <Link href={href}>Resume</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void discard()}>
              {busy ? 'Discarding…' : 'Discard'}
            </Button>
          </div>
        </>
      ) : null}
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
