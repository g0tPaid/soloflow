import { describe, expect, it } from 'vitest';
import { FORM_DRAFT_AUTOSAVE_MS, FORM_DRAFT_MAX_CHARS, formDraftContent, formDraftKey, packFormDraft, type FormDraftScope, type FormDraftSnapshot } from '@/lib/form-draft/model';
import { createFormDraftRepository, type FormDraftDurable, type FormDraftRepository } from '@/lib/form-draft/repository';
import { FormDraftSession } from '@/lib/form-draft/session';
import type { StoredFormDraft } from '@/lib/offline/types';

const invoiceScope: FormDraftScope = {
  userId: 'user_a',
  organizationId: 'org_a',
  kind: 'invoice',
  documentId: 'new',
};

function content(notes: string, extra: Parameters<typeof formDraftContent>[0] = {}) {
  return formDraftContent({ notes, number: 'INV-00007', customerId: 'cus_1', currency: 'CNY', ...extra });
}

function snapshot(scope: FormDraftScope, notes: string, savedAt = 5_000): FormDraftSnapshot {
  return {
    version: 1,
    scope,
    savedAt,
    imagesOmitted: false,
    content: content(notes),
  };
}

function fakeRepository() {
  const rows = new Map<string, FormDraftSnapshot>();
  let failWrites = false;
  let writes = 0;
  const repository: FormDraftRepository = {
    async read(scope) {
      return rows.get(formDraftKey(scope)) ?? null;
    },
    async write(next) {
      writes += 1;
      if (failWrites) throw new Error('Could not save the draft on this device');
      rows.set(formDraftKey(next.scope), next);
      return { imagesOmitted: next.imagesOmitted };
    },
    async remove(scope) {
      rows.delete(formDraftKey(scope));
    },
  };
  return {
    repository,
    rows,
    writes: () => writes,
    setFailWrites: (value: boolean) => {
      failWrites = value;
    },
  };
}

class MemoryDurable implements FormDraftDurable {
  rows = new Map<string, StoredFormDraft>();
  failWrites = false;

  async get(key: string) {
    return this.rows.get(key) ?? null;
  }

  async put(record: StoredFormDraft) {
    if (this.failWrites) throw new Error('disk full');
    this.rows.set(record.key, record);
  }

  async delete(key: string) {
    this.rows.delete(key);
  }
}

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  fail = false;

  get length() {
    return this.items.size;
  }

  clear() {
    this.items.clear();
  }

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  setItem(key: string, value: string) {
    if (this.fail) throw new Error('quota');
    this.items.set(key, value);
  }
}

describe('form draft autosave', () => {
  it('uses a 5 second cadence and skips unchanged snapshots', async () => {
    expect(FORM_DRAFT_AUTOSAVE_MS).toBe(5_000);
    const store = fakeRepository();
    const session = new FormDraftSession(invoiceScope, store.repository, content(''));

    session.note(content('hello'), 0);
    await session.tick(4_999);
    expect(store.writes()).toBe(0);

    await session.tick(5_000);
    expect(store.writes()).toBe(1);
    expect((await store.repository.read(invoiceScope))?.content.notes).toBe('hello');

    await session.tick(10_000);
    session.note(content('hello'), 10_001);
    await session.tick(15_000);
    expect(store.writes()).toBe(1);

    session.note(content('hello again'), 15_001);
    await session.tick(20_000);
    expect(store.writes()).toBe(1);
    await session.tick(20_001);
    expect(store.writes()).toBe(2);
    expect((await store.repository.read(invoiceScope))?.content.notes).toBe('hello again');
  });

  it('flushes immediately on navigation without waiting for the interval', async () => {
    const store = fakeRepository();
    const session = new FormDraftSession(invoiceScope, store.repository, content(''));
    session.note(content('leaving'), 1_000);
    await session.flush(1_200);
    expect(store.writes()).toBe(1);
    expect((await store.repository.read(invoiceScope))?.content.notes).toBe('leaving');
  });

  it('restores a saved draft for the same user, organization, and document', async () => {
    const store = fakeRepository();
    const session = new FormDraftSession(invoiceScope, store.repository, content(''));
    session.note(
      content('keep me', {
        customerId: 'cus_9',
        currency: 'AED',
        currencyTouched: true,
        shipping: 12,
        taxRate: 5,
        dueDate: '2026-12-01',
        items: [
          {
            productId: null,
            name: 'Widget',
            description: 'Blue',
            quantity: 2,
            unitPrice: 15,
            taxRate: 0,
            imageUrl: 'https://cdn.example/widget.jpg',
          },
        ],
      }),
      0,
    );
    await session.tick(5_000);

    const restored = await new FormDraftSession(invoiceScope, store.repository, content('')).load();
    expect(restored?.content.notes).toBe('keep me');
    expect(restored?.content.customerId).toBe('cus_9');
    expect(restored?.content.currency).toBe('AED');
    expect(restored?.content.shipping).toBe(12);
    expect(restored?.content.taxRate).toBe(5);
    expect(restored?.content.dueDate).toBe('2026-12-01');
    expect(restored?.content.items[0]).toMatchObject({
      name: 'Widget',
      description: 'Blue',
      quantity: 2,
      unitPrice: 15,
      imageUrl: 'https://cdn.example/widget.jpg',
    });
  });

  it('keeps invoice, quote, user, organization, and document drafts apart', async () => {
    const store = fakeRepository();
    const scopes: FormDraftScope[] = [
      invoiceScope,
      { ...invoiceScope, kind: 'quote' },
      { ...invoiceScope, userId: 'user_b' },
      { ...invoiceScope, organizationId: 'org_b' },
      { ...invoiceScope, documentId: 'inv_1' },
    ];
    for (const scope of scopes) {
      const session = new FormDraftSession(scope, store.repository, content(''));
      session.note(content(formDraftKey(scope)), 0);
      await session.tick(5_000);
    }
    expect(new Set(scopes.map(formDraftKey)).size).toBe(scopes.length);
    for (const scope of scopes) {
      expect((await store.repository.read(scope))?.content.notes).toBe(formDraftKey(scope));
    }
    const quote = await new FormDraftSession(scopes[1], store.repository, content('')).load();
    const invoice = await new FormDraftSession(invoiceScope, store.repository, content('')).load();
    expect(quote?.content.notes).not.toBe(invoice?.content.notes);
  });

  it('clears only the saved document after an explicit save', async () => {
    const store = fakeRepository();
    const quoteScope: FormDraftScope = { ...invoiceScope, kind: 'quote', documentId: 'quo_1' };
    const invoice = new FormDraftSession(invoiceScope, store.repository, content(''));
    const quote = new FormDraftSession(quoteScope, store.repository, content(''));
    invoice.note(content('invoice draft'), 0);
    quote.note(content('quote draft'), 0);
    await invoice.tick(5_000);
    await quote.tick(5_000);

    await invoice.markExplicitSave(content('invoice draft'), 6_000);
    expect(await store.repository.read(invoiceScope)).toBeNull();
    expect((await store.repository.read(quoteScope))?.content.notes).toBe('quote draft');

    await invoice.flush(7_000);
    expect(await store.repository.read(invoiceScope)).toBeNull();
  });

  it('keeps the previous draft and the typed changes when a save fails', async () => {
    const store = fakeRepository();
    const session = new FormDraftSession(invoiceScope, store.repository, content(''));
    session.note(content('first'), 0);
    await session.tick(5_000);
    store.setFailWrites(true);
    session.note(content('second'), 6_000);
    await session.tick(11_000);

    expect(session.status().phase).toBe('error');
    expect(session.status().error).toMatch(/could not save/i);
    expect(session.currentContent().notes).toBe('second');
    expect((await store.repository.read(invoiceScope))?.content.notes).toBe('first');

    store.setFailWrites(false);
    await session.tick(16_000);
    expect(session.status().phase).toBe('saved');
    expect((await store.repository.read(invoiceScope))?.content.notes).toBe('second');
  });

  it('does not write a draft when nothing has changed', async () => {
    const store = fakeRepository();
    const session = new FormDraftSession(invoiceScope, store.repository, content(''));
    await session.tick(10_000);
    await session.flush(10_000);
    expect(store.writes()).toBe(0);
  });

  it('drops inline photos that do not fit and keeps the rest of the draft', () => {
    const huge = `data:image/jpeg;base64,${'a'.repeat(FORM_DRAFT_MAX_CHARS)}`;
    const packed = packFormDraft(
      snapshot(invoiceScope, 'photo note', 5_000),
    );
    const oversized = packFormDraft({
      ...packed,
      content: formDraftContent({
        notes: 'photo note',
        items: [
          {
            productId: null,
            name: 'Widget',
            description: 'Keep this',
            quantity: 1,
            unitPrice: 4,
            taxRate: 0,
            imageUrl: huge,
          },
          {
            productId: null,
            name: 'Remote',
            description: '',
            quantity: 1,
            unitPrice: 1,
            taxRate: 0,
            imageUrl: 'https://cdn.example/remote.jpg',
          },
        ],
      }),
    });
    expect(oversized.imagesOmitted).toBe(true);
    expect(oversized.content.notes).toBe('photo note');
    expect(oversized.content.items[0].imageUrl).toBeNull();
    expect(oversized.content.items[0].description).toBe('Keep this');
    expect(oversized.content.items[1].imageUrl).toBe('https://cdn.example/remote.jpg');
  });

  it('recovers from the local mirror when the primary store fails', async () => {
    const durable = new MemoryDurable();
    const local = new MemoryStorage();
    durable.failWrites = true;
    const repository = createFormDraftRepository({ durable, localStorage: local });
    await repository.write(snapshot(invoiceScope, 'mirrored'));
    expect(durable.rows.size).toBe(0);

    const reopened = createFormDraftRepository({ durable, localStorage: local });
    expect((await reopened.read(invoiceScope))?.content.notes).toBe('mirrored');
  });

  it('leaves the previous primary copy in place when every store fails', async () => {
    const durable = new MemoryDurable();
    const local = new MemoryStorage();
    const repository = createFormDraftRepository({ durable, localStorage: local });
    await repository.write(snapshot(invoiceScope, 'safe'));
    durable.failWrites = true;
    local.fail = true;
    await expect(repository.write(snapshot(invoiceScope, 'newer', 9_000))).rejects.toThrow(/could not save/i);
    const fresh = createFormDraftRepository({
      durable: {
        get: (key) => durable.get(key),
        put: (record) => durable.put(record),
        delete: (key) => durable.delete(key),
      },
      localStorage: local,
    });
    durable.failWrites = false;
    expect((await fresh.read(invoiceScope))?.content.notes).toBe('safe');
  });
});
