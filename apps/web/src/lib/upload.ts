import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function saveUpload(
  file: File,
  folder = 'uploads',
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED.has(file.type)) {
    return { error: 'Only JPG, PNG, WebP or GIF images are allowed' };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Image must be under 3 MB' };
  }

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg';

  const name = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
  const dir = path.join(process.cwd(), 'public', folder);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return { url: `/${folder}/${name}` };
}
