import type { Metadata } from 'next';
import { Suspense } from 'react';
import { articles } from '@/lib/catalog';
import { JournalIndex } from '@/components/journal/journal-index';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Essays on materials, repair, and things worth buying once.',
};

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="container-pt py-20 text-muted">Loading journal…</div>}>
      <JournalIndex articles={articles} />
    </Suspense>
  );
}
