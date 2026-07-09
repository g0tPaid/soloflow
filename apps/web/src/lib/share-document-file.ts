export type ShareResult = 'shared' | 'cancelled' | 'fallback';

async function tryNativeShare(data: ShareData): Promise<ShareResult | null> {
  if (!navigator.share) return null;

  try {
    if (navigator.canShare && !navigator.canShare(data)) return null;
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    if ((error as Error).name === 'AbortError') return 'cancelled';
    return null;
  }
}

export async function shareDocumentByEmail(
  file: File,
  subject: string,
  body: string,
): Promise<ShareResult> {
  const attempts: ShareData[] = [
    { files: [file], title: subject, text: body },
    { files: [file] },
  ];

  for (const data of attempts) {
    const result = await tryNativeShare(data);
    if (result) return result;
  }

  const mailBody = `${body}\n\nThe PDF has been saved on your device — attach "${file.name}" in your email app.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}`;
  return 'fallback';
}
