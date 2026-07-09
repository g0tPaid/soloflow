export type ShareResult = 'shared' | 'cancelled' | 'fallback';

export async function shareInvoiceFile(
  file: File,
  text: string,
  phone?: string,
): Promise<ShareResult> {
  if (navigator.share) {
    const attempts: ShareData[] = [{ files: [file] }, { files: [file], text }];

    for (const data of attempts) {
      try {
        if (navigator.canShare && !navigator.canShare(data)) continue;
        await navigator.share(data);
        return 'shared';
      } catch (error) {
        if ((error as Error).name === 'AbortError') return 'cancelled';
      }
    }
  }

  const blobUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(blobUrl);

  const waText = encodeURIComponent(`${text}\n\n(Invoice file downloaded — attach it in WhatsApp)`);
  const waUrl = phone ? `https://wa.me/${phone}?text=${waText}` : `https://wa.me/?text=${waText}`;
  window.setTimeout(() => {
    window.location.href = waUrl;
  }, 400);

  return 'fallback';
}
