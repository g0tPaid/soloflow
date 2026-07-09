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
    if ((error as Error).name === 'AbortError') return false;
    return false;
  }
}

/** Save/share PDF on mobile — anchor download often fails in Capacitor WebView. */
export async function savePdfToDevice(file: File): Promise<boolean> {
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

  const url = URL.createObjectURL(file);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
