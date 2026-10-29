import { describe, expect, it } from 'vitest';
import { choosePdfSaveStrategy } from '@/lib/save-pdf-to-device';

describe('choosePdfSaveStrategy', () => {
  it('downloads on desktop without the server', () => {
    expect(choosePdfSaveStrategy({ coarsePointer: false, nativePlatform: false, onLine: false })).toBe('anchor');
  });

  it('writes the Android app file through Capacitor', () => {
    expect(choosePdfSaveStrategy({ coarsePointer: true, nativePlatform: true, onLine: false })).toBe('native-file');
  });

  it('keeps the phone browser relay only while online', () => {
    expect(choosePdfSaveStrategy({ coarsePointer: true, nativePlatform: false, onLine: true })).toBe('server-relay');
    expect(choosePdfSaveStrategy({ coarsePointer: true, nativePlatform: false, onLine: false })).toBe('device-share');
  });
});
