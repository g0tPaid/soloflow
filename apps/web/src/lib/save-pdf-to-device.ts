function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** How a phone or desktop should persist a PDF that is already in memory. */
export function choosePdfSaveStrategy(input: {
  coarsePointer: boolean;
  nativePlatform: boolean;
  onLine: boolean;
}): 'anchor' | 'native-file' | 'device-share' | 'server-relay' {
  if (!input.coarsePointer) return 'anchor';
  if (input.nativePlatform) return 'native-file';
  if (!input.onLine) return 'device-share';
  return 'server-relay';
}

function isNativePlatform() {
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

function triggerAnchorDownload(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function savePdfOnDeviceWithoutServer(file: File): Promise<'saved' | 'cancelled'> {
  if (typeof navigator.share === 'function') {
    const data: ShareData = { files: [file], title: file.name };
    if (!navigator.canShare || navigator.canShare(data)) {
      try {
        await navigator.share(data);
        return 'saved';
      } catch (error) {
        if ((error as Error).name === 'AbortError') return 'cancelled';
      }
    }
  }
  triggerAnchorDownload(file);
  return 'saved';
}

function submitPdfDownloadForm(file: File, base64: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/pdf/download';
  form.target = '_blank';
  form.style.display = 'none';

  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'data';
  dataInput.value = base64;
  form.appendChild(dataInput);

  const nameInput = document.createElement('input');
  nameInput.type = 'hidden';
  nameInput.name = 'filename';
  nameInput.value = file.name;
  form.appendChild(nameInput);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

async function saveWithCapacitorFilesystem(file: File, base64: string): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const safeName = file.name.replace(/[^\w.-]/g, '_');

    const written = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

    await Share.share({
      title: safeName,
      text: `Saved to Documents/${safeName}`,
      url: written.uri,
      dialogTitle: 'PDF saved — open or share',
    });
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return true;
    return false;
  }
}

async function saveWithCapacitorShare(file: File): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = await fileToBase64(file);
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const written = await Filesystem.writeFile({
      path: safeName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: safeName,
      text: safeName,
      url: written.uri,
      dialogTitle: 'Save or share PDF',
    });
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') return true;
    return false;
  }
}

/**
 * Save a PDF the app already has.
 * Desktop uses a file download. The Android app writes Documents via Capacitor.
 * A phone browser relays through the server only while online; offline it uses
 * the share sheet or a local download so the PWA does not need the network.
 */
export async function downloadPdfToDevice(file: File): Promise<'saved' | 'cancelled'> {
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const onLine = typeof navigator === 'undefined' || navigator.onLine;
  const strategy = choosePdfSaveStrategy({
    coarsePointer: coarse,
    nativePlatform: typeof window !== 'undefined' && isNativePlatform(),
    onLine,
  });

  if (strategy === 'anchor') {
    triggerAnchorDownload(file);
    return 'saved';
  }

  // Try the native bridge whenever this is a phone. The PWA has no Capacitor
  // global, so this returns false and we continue with the strategy above.
  const base64 = await fileToBase64(file);
  if (await saveWithCapacitorFilesystem(file, base64)) return 'saved';

  if (strategy === 'device-share' || !onLine) {
    return savePdfOnDeviceWithoutServer(file);
  }

  submitPdfDownloadForm(file, base64);
  return 'saved';
}

/** Save PDF — share sheet on mobile, form POST download as fallback. */
export async function savePdfToDevice(file: File): Promise<boolean> {
  if (navigator.share) {
    try {
      const data: ShareData = { files: [file], title: file.name };
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data);
        return true;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return false;
    }
  }

  const base64 = await fileToBase64(file);
  if (await saveWithCapacitorFilesystem(file, base64)) return true;

  submitPdfDownloadForm(file, base64);
  return true;
}

export async function createPdfDownloadUrl(file: File): Promise<string | null> {
  try {
    const data = await fileToBase64(file);
    const response = await fetch('/api/pdf/stash', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, filename: file.name }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { downloadUrl?: string };
    return json.downloadUrl ?? null;
  } catch {
    return null;
  }
}

// Kept for share fallbacks when form POST is not used.
export async function savePdfToDeviceWithShareFallback(file: File): Promise<boolean> {
  const saved = await savePdfToDevice(file);
  if (saved) return true;

  if (await saveWithCapacitorShare(file)) return true;

  if (navigator.share) {
    try {
      const data: ShareData = { files: [file], title: file.name };
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data);
        return true;
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return false;
    }
  }

  return false;
}
