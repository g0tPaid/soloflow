import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';

describe('api.invoices.update', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes fulfillmentStatus null in the PATCH body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'inv_1', fulfillmentStatus: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.invoices.update('token', 'org_1', 'inv_1', { fulfillmentStatus: null });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/invoices/inv_1');
    expect(init.method).toBe('PATCH');
    expect(init.cache).toBe('no-store');
    expect(JSON.parse(String(init.body))).toEqual({ fulfillmentStatus: null });
  });
});
