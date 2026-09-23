import { describe, expect, it } from 'vitest';
import {
  applyFulfillmentStatusToPage,
  fulfillmentStatusPatch,
} from '@/lib/fulfillment-cache';

describe('fulfillment cache', () => {
  it('keeps a null clear and ignores tracking-only patches', () => {
    expect(fulfillmentStatusPatch({ fulfillmentStatus: null })).toBeNull();
    expect(fulfillmentStatusPatch({ fulfillmentStatus: 'QC_COMPLETED' })).toBe('QC_COMPLETED');
    expect(fulfillmentStatusPatch({})).toBeUndefined();
  });

  it('clears the matching invoice on the list and leaves the others', () => {
    const page = {
      data: [
        { id: 'a', fulfillmentStatus: 'LOCAL_ORDERING_COMPLETED' as const },
        { id: 'b', fulfillmentStatus: 'QC_COMPLETED' as const },
      ],
    };
    expect(applyFulfillmentStatusToPage(page, 'a', null)).toEqual({
      data: [
        { id: 'a', fulfillmentStatus: null },
        { id: 'b', fulfillmentStatus: 'QC_COMPLETED' },
      ],
    });
    expect(applyFulfillmentStatusToPage(undefined, 'a', null)).toBeUndefined();
  });
});
