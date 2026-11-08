import {
  evaluateDraftWrite,
  formDraftFingerprint,
  normalizeFormDraftContent,
  rebaseUntouchedDraft,
  type FormDraftContent,
  type FormDraftScope,
  type FormDraftSnapshot,
} from '@/lib/form-draft/model';
import type { FormDraftRepository } from '@/lib/form-draft/repository';

export type FormDraftPhase = 'idle' | 'saving' | 'saved' | 'error';

export interface FormDraftStatus {
  phase: FormDraftPhase;
  savedAt: number | null;
  error: string | null;
  imagesOmitted: boolean;
  dirty: boolean;
}

/**
 * Tracks one invoice or quote form. Writes only the local draft repository.
 * It does not create documents, assign numbers, or call the network.
 */
export class FormDraftSession {
  private baseline: FormDraftContent;
  private current: FormDraftContent;
  private changedAt: number | null = null;
  private lastAttemptAt: number | null = null;
  private lastPersistedFingerprint: string | null = null;
  private lastSuccessfulAt: number | null = null;
  private imagesOmitted = false;
  private phase: FormDraftPhase = 'idle';
  private error: string | null = null;
  private writesPaused = false;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly scope: FormDraftScope,
    private readonly repository: FormDraftRepository,
    baseline: FormDraftContent,
  ) {
    this.baseline = normalizeFormDraftContent(baseline);
    this.current = normalizeFormDraftContent(baseline);
  }

  getScope() {
    return this.scope;
  }

  baselineContent() {
    return normalizeFormDraftContent(this.baseline);
  }

  currentContent() {
    return normalizeFormDraftContent(this.current);
  }

  status(): FormDraftStatus {
    return {
      phase: this.phase,
      savedAt: this.lastSuccessfulAt,
      error: this.error,
      imagesOmitted: this.imagesOmitted,
      dirty: formDraftFingerprint(this.current) !== formDraftFingerprint(this.baseline),
    };
  }

  pauseWrites() {
    this.writesPaused = true;
  }

  async load(): Promise<FormDraftSnapshot | null> {
    const stored = await this.repository.read(this.scope);
    if (!stored) return null;
    const content = normalizeFormDraftContent(stored.content);
    const fingerprint = formDraftFingerprint(content);
    this.current = content;
    this.lastPersistedFingerprint = fingerprint;
    this.lastSuccessfulAt = stored.savedAt;
    this.imagesOmitted = stored.imagesOmitted;
    if (fingerprint === formDraftFingerprint(this.baseline)) {
      this.phase = 'idle';
      return null;
    }
    this.phase = 'saved';
    return { ...stored, content };
  }

  note(content: FormDraftContent, now: number) {
    if (this.writesPaused) return;
    const next = normalizeFormDraftContent(content);
    const nextFingerprint = formDraftFingerprint(next);
    const previousFingerprint = formDraftFingerprint(this.current);
    this.current = next;
    if (nextFingerprint === previousFingerprint) return;
    if (
      nextFingerprint === formDraftFingerprint(this.baseline) ||
      nextFingerprint === this.lastPersistedFingerprint
    ) {
      this.changedAt = null;
      if (this.phase !== 'error') {
        this.phase = nextFingerprint === this.lastPersistedFingerprint && this.lastSuccessfulAt ? 'saved' : 'idle';
      }
      return;
    }
    if (this.changedAt == null) this.changedAt = now;
  }

  /** Apply a system field such as the suggested document number without marking the form dirty. */
  adoptBaseline(patch: Partial<FormDraftContent>) {
    if (this.writesPaused) return;
    const previous = this.baseline;
    const next = normalizeFormDraftContent({ ...previous, ...patch, items: patch.items ?? previous.items });
    this.current = rebaseUntouchedDraft(this.current, previous, next);
    this.baseline = next;
    const currentFingerprint = formDraftFingerprint(this.current);
    if (
      currentFingerprint === formDraftFingerprint(this.baseline) ||
      currentFingerprint === this.lastPersistedFingerprint
    ) {
      this.changedAt = null;
    }
  }

  tick(now: number) {
    return this.enqueue(() => this.writeIfDue(now, false));
  }

  /** Best-effort local write when the screen is hidden or the route changes. */
  flush(now: number) {
    return this.enqueue(() => this.writeIfDue(now, true));
  }

  async markExplicitSave(saved: FormDraftContent, now: number) {
    await this.enqueue(async () => {
      const savedContent = normalizeFormDraftContent(saved);
      this.baseline = savedContent;
      const pending = formDraftFingerprint(this.current) !== formDraftFingerprint(savedContent);
      this.lastPersistedFingerprint = null;
      this.lastSuccessfulAt = null;
      this.changedAt = pending ? now : null;
      this.phase = 'idle';
      this.error = null;
      this.imagesOmitted = false;
      if (!pending) {
        await this.repository.remove(this.scope);
        return;
      }
      await this.repository.remove(this.scope);
      await this.writeIfDue(now, true);
    });
  }

  async discard() {
    await this.enqueue(async () => {
      await this.repository.remove(this.scope);
      this.current = normalizeFormDraftContent(this.baseline);
      this.changedAt = null;
      this.lastAttemptAt = null;
      this.lastPersistedFingerprint = null;
      this.lastSuccessfulAt = null;
      this.imagesOmitted = false;
      this.phase = 'idle';
      this.error = null;
    });
  }

  private enqueue(task: () => Promise<void>) {
    const run = this.chain.then(task, task);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async writeIfDue(now: number, force: boolean) {
    if (this.writesPaused) return;
    const decision = evaluateDraftWrite({
      now,
      changedAt: this.changedAt,
      lastAttemptAt: this.lastAttemptAt,
      current: this.current,
      baseline: this.baseline,
      persistedFingerprint: this.lastPersistedFingerprint,
      force,
    });
    if (decision !== 'write') {
      if (decision === 'unchanged' && this.phase !== 'error') this.phase = 'saved';
      if (decision === 'clean' && this.phase === 'saving') this.phase = 'idle';
      return;
    }
    const content = normalizeFormDraftContent(this.current);
    const fingerprint = formDraftFingerprint(content);
    this.phase = 'saving';
    this.lastAttemptAt = now;
    try {
      const result = await this.repository.write({
        version: 1,
        scope: this.scope,
        savedAt: now,
        content,
        imagesOmitted: false,
      });
      this.lastPersistedFingerprint = fingerprint;
      this.lastSuccessfulAt = now;
      this.imagesOmitted = result.imagesOmitted;
      this.error = null;
      if (formDraftFingerprint(this.current) === fingerprint) {
        this.changedAt = null;
        this.phase = 'saved';
      } else if (this.changedAt == null) {
        this.changedAt = now;
        this.phase = 'saved';
      } else {
        this.phase = 'saved';
      }
    } catch (error) {
      this.phase = 'error';
      this.error = error instanceof Error ? error.message : 'Could not save the draft';
    }
  }
}
