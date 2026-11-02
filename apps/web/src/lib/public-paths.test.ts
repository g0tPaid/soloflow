import { describe, expect, it } from 'vitest';
import { isPublicPath } from './public-paths';

describe('isPublicPath', () => {
  it('keeps sign-in, privacy, and crawler files public', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/register')).toBe(true);
    expect(isPublicPath('/privacy')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
    expect(isPublicPath('/api/auth/callback/credentials')).toBe(true);
    expect(isPublicPath('/robots.txt')).toBe(true);
    expect(isPublicPath('/sitemap.xml')).toBe(true);
  });

  it('keeps the accounting app private', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/dashboard')).toBe(false);
    expect(isPublicPath('/invoices')).toBe(false);
    expect(isPublicPath('/invoices/new')).toBe(false);
    expect(isPublicPath('/quotes')).toBe(false);
    expect(isPublicPath('/customers')).toBe(false);
    expect(isPublicPath('/admin')).toBe(false);
    expect(isPublicPath('/print/invoices/1')).toBe(false);
    expect(isPublicPath('/robots.txt/extra')).toBe(false);
    expect(isPublicPath('/sitemap.xml.bak')).toBe(false);
  });
});
