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

function submitPdfDownloadForm(file: File, base64: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/pdf/download';
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

/** Save PDF — form POST download works in Android WebView where blob URLs are blocked. */
export async function savePdfToDevice(file: File): Promise<boolean> {
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
