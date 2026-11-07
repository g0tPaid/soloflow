'use client';

import { Button } from '@/components/ui/button';
import type { DocumentDraftController } from '@/hooks/use-document-draft';

function formatDraftTime(savedAt: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(savedAt));
  } catch {
    return new Date(savedAt).toLocaleTimeString();
  }
}

export function DraftStatus({
  kind,
  draft,
}: {
  kind: 'invoice' | 'quote';
  draft: DocumentDraftController;
}) {
  if (!draft.enabled) return null;
  const noun = kind === 'invoice' ? 'invoice' : 'quote';
  const showDiscard = draft.restoredAt != null || draft.phase === 'saved' || draft.phase === 'error';

  return (
    <div className="space-y-2" aria-live="polite">
      {draft.restoredAt != null && (
        <div className="rounded-md border border-[#E40046]/30 bg-[#E40046]/5 px-3 py-2 text-sm">
          <p>
            Recovered unsaved {noun} changes from {formatDraftTime(draft.restoredAt)}. They are stored
            on this device and have not been submitted.
          </p>
          {draft.restoredImagesOmitted && (
            <p className="mt-1 text-muted-foreground">
              Photos were too large to keep in that draft. Add them again.
            </p>
          )}
        </div>
      )}
      {draft.loadError && <p className="text-sm text-destructive">{draft.loadError}</p>}
      {draft.phase === 'saving' && <p className="text-sm text-muted-foreground">Saving draft…</p>}
      {draft.phase === 'saved' && (
        <p className="text-sm text-muted-foreground">
          Draft saved on this device.
          {draft.imagesOmitted
            ? ' Photos were too large to include — they stay on this screen until you leave.'
            : ''}
        </p>
      )}
      {draft.phase === 'error' && (
        <p className="text-sm text-destructive">
          {draft.error ?? "Couldn't save the draft."} Your changes are still on this screen.
        </p>
      )}
      {draft.phase === 'idle' && !draft.loadError && (
        <p className="text-sm text-muted-foreground">
          Unsaved changes are kept on this device every 5 seconds. This does not submit the {noun}.
        </p>
      )}
      {showDiscard && (
        <Button type="button" variant="outline" onClick={() => void draft.discard()}>
          Discard draft
        </Button>
      )}
    </div>
  );
}
