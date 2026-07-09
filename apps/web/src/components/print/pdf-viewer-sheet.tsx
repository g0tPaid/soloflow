'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Download, MessageCircle, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PreparedPdf } from '@/lib/capture-element-image';
import { savePdfToDevice } from '@/lib/save-pdf-to-device';

type Props = {
  prepared: PreparedPdf;
  onClose: () => void;
  onWhatsApp?: () => void;
  onShareEmail?: () => void;
};

export function PdfViewerSheet({ prepared, onClose, onWhatsApp, onShareEmail }: Props) {
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const saved = await savePdfToDevice(prepared.file);
      setSaveMessage(saved ? 'Download started — check your notifications or Files app.' : 'Could not start download. Try Share instead.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="no-print fixed inset-0 z-[60] flex flex-col bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="gap-1">
          <X className="h-4 w-4" />
          Close
        </Button>
        <p className="min-w-0 flex-1 truncate text-xs text-slate-400">{prepared.filename}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100">
        <img
          src={prepared.previewUrl}
          alt={prepared.filename}
          className="mx-auto block w-full max-w-[900px] bg-white shadow-sm"
        />
      </div>

      <div className="border-t border-slate-700 bg-slate-900 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[900px] flex-wrap gap-2">
          <Button type="button" variant="default" size="sm" className="flex-1 min-w-[7rem]" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex-1 min-w-[7rem] gap-1"
          >
            <Download className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save PDF'}
          </Button>
          {onShareEmail ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onShareEmail}
              className="flex-1 min-w-[7rem] gap-1"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          ) : null}
          {onWhatsApp ? (
            <Button
              type="button"
              size="sm"
              onClick={onWhatsApp}
              className="flex-1 min-w-[7rem] gap-1 bg-[#25D366] text-white hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          ) : null}
        </div>
        <Button type="button" className="mx-auto mt-3 w-full max-w-[900px]" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
        {saveMessage ? <p className="mx-auto mt-2 max-w-[900px] text-center text-xs text-slate-400">{saveMessage}</p> : null}
      </div>
    </div>
  );
}
