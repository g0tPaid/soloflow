'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PreparedPdf } from '@/lib/capture-element-image';
import { savePdfToDevice } from '@/lib/save-pdf-to-device';

type Props = {
  prepared: PreparedPdf;
  onClose: () => void;
  onWhatsApp?: () => void;
};

export function PdfViewerSheet({ prepared, onClose, onWhatsApp }: Props) {
  const [saving, setSaving] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await savePdfToDevice(prepared.file);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenInNewTab() {
    window.open(prepared.blobUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="no-print fixed inset-0 z-[60] flex flex-col bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="gap-1">
          <X className="h-4 w-4" />
          Close
        </Button>
        <Button type="button" variant="default" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={() => void handleSave()}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save PDF'}
        </Button>
        {onWhatsApp ? (
          <Button
            type="button"
            size="sm"
            onClick={onWhatsApp}
            className="gap-1 bg-[#25D366] text-white hover:bg-[#1ebe57]"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        ) : null}
        <p className="w-full truncate text-xs text-slate-400">{prepared.filename}</p>
      </div>

      {embedFailed ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <p className="text-sm text-slate-600">
            Your phone cannot preview PDFs inside the app. Tap below to open or save the file.
          </p>
          <Button type="button" onClick={handleOpenInNewTab}>
            Open PDF
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save / Share PDF'}
          </Button>
        </div>
      ) : (
        <object
          data={prepared.blobUrl}
          type="application/pdf"
          className="min-h-0 flex-1 w-full bg-white"
          onError={() => setEmbedFailed(true)}
        >
          <iframe
            src={prepared.blobUrl}
            title={prepared.filename}
            className="min-h-0 h-full w-full bg-white"
            onError={() => setEmbedFailed(true)}
          />
        </object>
      )}

      <div className="border-t border-slate-700 bg-slate-900 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" className="w-full" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
