'use client';

import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { INVOICE_BANNER_SIZE } from '@flowbooks/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Props = {
  value?: string | null;
  onChange: (url: string | undefined) => void;
  label?: string;
  compact?: boolean;
  variant?: 'square' | 'banner';
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
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

  async function handleFile(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      return;
    }

    setUploading(true);
    try {
      // Banners are embedded in the database so they survive Railway redeploys
      if (isBanner) {
        const dataUrl = await readFileAsDataUrl(file);
        onChange(dataUrl);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        onChange(data.url);
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      onChange(dataUrl);
    } catch {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        onChange(dataUrl);
      } catch {
        // ignore — user can retry
      }
    } finally {
      setUploading(false);
    }
  }

  const isBanner = variant === 'banner';
  const size = compact ? 56 : isBanner ? 0 : 96;

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
            style={isBanner ? { height: 120 } : { width: size, height: size }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className={isBanner ? 'h-full w-full object-cover' : 'h-full w-full object-cover'}
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
            style={isBanner ? { height: 120 } : { width: size, height: size }}
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
            JPG, PNG or WebP · max 3 MB
            {isBanner ? ` · recommended ${INVOICE_BANNER_SIZE.label}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
