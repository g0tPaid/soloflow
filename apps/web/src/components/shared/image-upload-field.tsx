'use client';

import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { INVOICE_BANNER_SIZE } from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { resolveImageSrc } from '@/lib/organization-branding';
import { compressImageFile, prepareFixedSquareImage } from '@/lib/compress-image';

type Props = {
  value?: string | null;
  onChange: (url: string | undefined) => void;
  label?: string;
  compact?: boolean;
  variant?: 'square' | 'banner' | 'signature';
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

async function prepareImageDataUrl(
  file: File,
  variant: 'square' | 'banner' | 'signature',
): Promise<string> {
  // Offers + signature: sharp 300×300, small enough to save with other images
  if (variant === 'signature') {
    return prepareFixedSquareImage(file, 300, 280_000);
  }
  // Legacy wide banner — keep under ~800KB
  if (variant === 'banner') {
    return compressImageFile(file, {
      maxWidth: 1600,
      maxHeight: 500,
      maxBytes: 800_000,
      quality: 0.9,
    });
  }
  try {
    return await compressImageFile(file, {
      maxWidth: 512,
      maxHeight: 512,
      maxBytes: 350_000,
    });
  } catch {
    return readFileAsDataUrl(file);
  }
}

export function ImageUploadField({
  value,
  onChange,
  label = 'Photo',
  compact = false,
  variant = 'square',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isBanner = variant === 'banner';
  const isSignature = variant === 'signature';
  const size = compact ? 56 : isSignature ? 300 : 96;
  const previewSrc = value ? resolveImageSrc(value) : undefined;
  const [uploadError, setUploadError] = useState('');

  async function handleFile(file: File) {
    const maxBytes = isSignature || isBanner ? 8 * 1024 * 1024 : 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(isSignature ? 'Image must be under 8 MB' : 'Image must be under 3 MB');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const dataUrl = await prepareImageDataUrl(file, variant);
      onChange(dataUrl);
    } catch {
      setUploadError('Could not process image. Try a smaller PNG or JPG.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className={isBanner ? 'space-y-3' : 'flex items-center gap-3'}>
        {value ? (
          <div
            className={
              isBanner
                ? 'relative w-full max-w-xl overflow-hidden rounded-xl border bg-muted'
                : 'relative shrink-0 overflow-hidden rounded-xl border bg-muted'
            }
            style={
              isBanner
                ? undefined
                : isSignature
                  ? { width: 300, height: 300 }
                  : { width: size, height: size }
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt=""
              className={
                isBanner
                  ? 'h-auto w-full object-contain'
                  : isSignature
                    ? 'h-full w-full bg-white object-contain'
                    : 'h-full w-full object-cover'
              }
            />
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            className={
              isBanner
                ? 'flex w-full max-w-xl items-center justify-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground'
                : 'flex shrink-0 items-center justify-center rounded-xl border border-dashed bg-muted/40 text-muted-foreground'
            }
            style={
              isBanner
                ? { height: 120 }
                : isSignature
                  ? { width: 300, height: 300 }
                  : { width: size, height: size }
            }
          >
            <Camera className="h-6 w-6" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : value ? 'Change image' : 'Add image'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isSignature
              ? 'PNG or JPG · saved as sharp 300×300 (fits invoice save limit)'
              : isBanner
                ? `PNG or JPG · recommended ${INVOICE_BANNER_SIZE.label}`
                : 'JPG, PNG or WebP · max 3 MB · auto-compressed for save'}
          </p>
          {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        </div>
      </div>
    </div>
  );
}
