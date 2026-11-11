import { afterEach, describe, expect, it } from 'vitest';
import robots from './robots';
import sitemap from './sitemap';

describe('public crawl files', () => {
  const previousAuth = process.env.AUTH_URL;
  const previousNextAuth = process.env.NEXTAUTH_URL;

  afterEach(() => {
    process.env.AUTH_URL = previousAuth;
    process.env.NEXTAUTH_URL = previousNextAuth;
  });

  it('allows the public site and blocks private app routes', () => {
    process.env.AUTH_URL = 'https://soloflow.practicalthings.store';
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(expect.arrayContaining(['/invoices', '/dashboard', '/admin', '/print']));
    expect(rule.disallow).not.toEqual(expect.arrayContaining(['/login', '/privacy', '/register']));
    expect(result.sitemap).toBe('https://soloflow.practicalthings.store/sitemap.xml');
  });

  it('lists only public pages in the sitemap', () => {
    process.env.AUTH_URL = 'https://soloflow.practicalthings.store';
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      'https://soloflow.practicalthings.store/login',
      'https://soloflow.practicalthings.store/register',
      'https://soloflow.practicalthings.store/privacy',
      'https://soloflow.practicalthings.store/forgot-password',
    ]);
  });
});
