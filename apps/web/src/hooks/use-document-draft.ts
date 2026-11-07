'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FORM_DRAFT_CHECK_MS,
  formDraftFingerprint,
  formDraftKey,
  normalizeFormDraftContent,
  type FormDraftContent,
  type FormDraftScope,
} from '@/lib/form-draft/model';
import { getFormDraftRepository, type FormDraftRepository } from '@/lib/form-draft/repository';
import { FormDraftSession, type FormDraftPhase } from '@/lib/form-draft/session';

export interface DocumentDraftController {
  enabled: boolean;
  restoredAt: number | null;
  restoredImagesOmitted: boolean;
  loadError: string | null;
  phase: FormDraftPhase;
  savedAt: number | null;
  error: string | null;
  imagesOmitted: boolean;
  publish: (content: FormDraftContent) => void;
  adoptBaseline: (patch: Partial<FormDraftContent>) => void;
  markExplicitSave: (saved: FormDraftContent) => Promise<void>;
  discard: () => Promise<void>;
}

const disabledController: DocumentDraftController = {
  enabled: false,
  restoredAt: null,
  restoredImagesOmitted: false,
  loadError: null,
  phase: 'idle',
  savedAt: null,
  error: null,
  imagesOmitted: false,
  publish: () => undefined,
  adoptBaseline: () => undefined,
  markExplicitSave: async () => undefined,
  discard: async () => undefined,
};

interface DraftState {
  ready: boolean;
  generation: number;
  initialContent: FormDraftContent;
  restoredAt: number | null;
  restoredImagesOmitted: boolean;
  loadError: string | null;
  phase: FormDraftPhase;
  savedAt: number | null;
  error: string | null;
  imagesOmitted: boolean;
}

export function useDocumentDraft(options: {
  scope: FormDraftScope | null;
  baseline: FormDraftContent;
  repository?: FormDraftRepository;
}): {
  ready: boolean;
  generation: number;
  initialContent: FormDraftContent;
  controller: DocumentDraftController;
} {
  const scope = options.scope;
  const scopeKey = scope ? formDraftKey(scope) : '';
  const repository = options.repository ?? getFormDraftRepository();
  const baselineRef = useRef(options.baseline);
  baselineRef.current = options.baseline;
  const sessionRef = useRef<FormDraftSession | null>(null);
  const [state, setState] = useState<DraftState>(() => ({
    ready: !scope,
    generation: 0,
    initialContent: normalizeFormDraftContent(options.baseline),
    restoredAt: null,
    restoredImagesOmitted: false,
    loadError: null,
    phase: 'idle',
    savedAt: null,
    error: null,
    imagesOmitted: false,
  }));

  function applyStatus(session: FormDraftSession, patch?: Partial<DraftState>) {
    const status = session.status();
    setState((current) => {
      const next = {
        ...current,
        ...patch,
        phase: status.phase,
        savedAt: status.savedAt,
        error: status.error,
        imagesOmitted: status.imagesOmitted,
      };
      if (
        next.ready === current.ready &&
        next.generation === current.generation &&
        next.restoredAt === current.restoredAt &&
        next.restoredImagesOmitted === current.restoredImagesOmitted &&
        next.loadError === current.loadError &&
        next.phase === current.phase &&
        next.savedAt === current.savedAt &&
        next.error === current.error &&
        next.imagesOmitted === current.imagesOmitted &&
        formDraftFingerprint(next.initialContent) === formDraftFingerprint(current.initialContent)
      ) {
        return current;
      }
      return next;
    });
  }

  useEffect(() => {
    if (!scope) {
      sessionRef.current = null;
      return;
    }
    let cancelled = false;
    const session = new FormDraftSession(scope, repository, baselineRef.current);
    sessionRef.current = session;
    void session
      .load()
      .then((stored) => {
        if (cancelled) return;
        applyStatus(session, {
          ready: true,
          loadError: null,
          initialContent: stored ? stored.content : session.baselineContent(),
          restoredAt: stored ? stored.savedAt : null,
          restoredImagesOmitted: Boolean(stored?.imagesOmitted),
        });
      })
      .catch(() => {
        if (cancelled) return;
        session.pauseWrites();
        applyStatus(session, {
          ready: true,
          loadError:
            'Could not read the saved draft. Autosave is paused so nothing already stored gets replaced.',
          initialContent: session.baselineContent(),
          restoredAt: null,
          restoredImagesOmitted: false,
        });
      });
    return () => {
      cancelled = true;
      void session.flush(Date.now());
    };
    // The baseline ref is read when the scope changes. Later system updates use adoptBaseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, repository]);

  useEffect(() => {
    if (!scope || !state.ready || state.loadError) return;
    const session = sessionRef.current;
    if (!session) return;
    const sync = () => applyStatus(session);
    const flush = () => {
      void session.flush(Date.now()).then(sync);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const timer = window.setInterval(() => {
      void session.tick(Date.now()).then(sync);
    }, FORM_DRAFT_CHECK_MS);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, state.ready, state.loadError]);

  const controller: DocumentDraftController = scope
    ? {
        enabled: true,
        restoredAt: state.restoredAt,
        restoredImagesOmitted: state.restoredImagesOmitted,
        loadError: state.loadError,
        phase: state.phase,
        savedAt: state.savedAt,
        error: state.error,
        imagesOmitted: state.imagesOmitted,
        publish: (content) => {
          const session = sessionRef.current;
          if (!session || state.loadError) return;
          session.note(content, Date.now());
          applyStatus(session);
        },
        adoptBaseline: (patch) => {
          const session = sessionRef.current;
          if (!session || state.loadError) return;
          session.adoptBaseline(patch);
          applyStatus(session);
        },
        markExplicitSave: async (saved) => {
          const session = sessionRef.current;
          if (!session) return;
          await session.markExplicitSave(saved, Date.now());
          applyStatus(session, { restoredAt: null, restoredImagesOmitted: false });
        },
        discard: async () => {
          const session = sessionRef.current;
          if (!session) return;
          try {
            await session.discard();
          } catch (error) {
            applyStatus(session, {
              loadError:
                error instanceof Error
                  ? error.message
                  : 'Could not discard the draft. Your changes are still on this screen.',
            });
            return;
          }
          const status = session.status();
          setState((current) => ({
            ...current,
            phase: status.phase,
            savedAt: status.savedAt,
            error: status.error,
            imagesOmitted: status.imagesOmitted,
            generation: current.generation + 1,
            initialContent: session.baselineContent(),
            restoredAt: null,
            restoredImagesOmitted: false,
            loadError: null,
          }));
        },
      }
    : disabledController;

  return {
    ready: !scope || state.ready,
    generation: state.generation,
    initialContent: state.initialContent,
    controller,
  };
}

/** Publish the latest form snapshot once its normalized content changes. */
export function usePublishFormDraft(controller: DocumentDraftController, content: FormDraftContent) {
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const contentRef = useRef(content);
  contentRef.current = content;
  const fingerprint = formDraftFingerprint(content);
  useEffect(() => {
    controllerRef.current.publish(contentRef.current);
  }, [fingerprint]);
}
