import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createLearnerProfile, createMagePrefab, validateCardProgram } from '../engine/mageFirstProof';

export const LEARNING_RUN_STORAGE_KEY = 'securedme.education.mage-first-proof.learning-run.v1';
export const LEARNING_RUN_INDEX_KEY = 'securedme.education.mage-first-proof.active-run.v2';
export const LEARNING_RUN_STAGES = Object.freeze(['Mission', 'Build', 'Check', 'Colab', 'Return', 'Reflect']);

function storageKey(runId) {
  return `${LEARNING_RUN_STORAGE_KEY}:${runId}`;
}

function safeLoad(storage, runId = null) {
  if (!storage) return null;
  try {
    const selectedRun = runId || storage.getItem(LEARNING_RUN_INDEX_KEY);
    const raw = selectedRun ? storage.getItem(storageKey(selectedRun)) : storage.getItem(LEARNING_RUN_STORAGE_KEY);
    const value = JSON.parse(raw || 'null');
    return value && value.schema === 'securedme.education.learning-run-state.v1' ? value : null;
  } catch (_error) {
    return null;
  }
}

function persist(storage, state) {
  if (!storage || !state.mission?.run_id) return;
  const visible = {
    schema: state.schema,
    mission: state.mission,
    profile: state.profile,
    cards: state.cards,
    activeStage: state.activeStage,
    artifactReceipt: state.artifactReceipt,
    colabReceipt: state.colabReceipt,
    retry: state.retry,
    broker: state.broker,
    updated_at: new Date().toISOString(),
    hidden_telemetry_stored: false,
  };
  storage.setItem(storageKey(state.mission.run_id), JSON.stringify(visible));
  storage.setItem(LEARNING_RUN_INDEX_KEY, state.mission.run_id);
}

function snapshot(state) {
  return { cards: state.cards, artifactReceipt: state.artifactReceipt, colabReceipt: state.colabReceipt, activeStage: state.activeStage };
}

function withHistory(state, patch) {
  return { ...patch, past: [...state.past, snapshot(state)].slice(-50), future: [] };
}

export function createLearningRunStore({ storage = typeof window !== 'undefined' ? window.localStorage : null } = {}) {
  const restored = safeLoad(storage);
  const initial = restored ? { ...restored, past: [], future: [] } : {
    schema: 'securedme.education.learning-run-state.v1',
    mission: null,
    profile: createLearnerProfile(),
    cards: createMagePrefab(),
    activeStage: 'Mission',
    artifactReceipt: null,
    colabReceipt: null,
    retry: { count: 0, last_reason: '', penalized: false },
    broker: { status: 'idle', run_id: null, message: 'Ready when you are.' },
    hidden_telemetry_stored: false,
    past: [],
    future: [],
  };

  const store = createStore((set, get) => ({
    ...initial,
    setMission: (mission) => set((state) => {
      if (state.mission?.run_id === mission?.run_id) return { ...state, mission };
      const saved = mission?.run_id ? safeLoad(storage, mission.run_id) : null;
      if (saved) return { ...state, ...saved, mission, past: [], future: [] };
      return {
        ...state,
        mission,
        cards: createMagePrefab(),
        activeStage: 'Build',
        artifactReceipt: null,
        colabReceipt: null,
        retry: { count: 0, last_reason: '', penalized: false },
        broker: { status: 'idle', run_id: mission?.run_id || null, message: 'A separate forge draft is ready for this adventure.' },
        past: [],
        future: [],
      };
    }),
    setProfile: (profile) => set((state) => ({ ...state, profile: createLearnerProfile(profile) })),
    setCards: (cards) => set((state) => withHistory(state, { cards: [...cards], artifactReceipt: null, colabReceipt: null })),
    moveCard: (fromIndex, toIndex) => set((state) => {
      const cards = [...state.cards];
      const [card] = cards.splice(fromIndex, 1);
      cards.splice(toIndex, 0, card);
      return withHistory(state, { cards, artifactReceipt: null, colabReceipt: null });
    }),
    updateCard: (cardId, properties) => set((state) => withHistory(state, { cards: state.cards.map((card) => card.id === cardId ? { ...card, properties: { ...card.properties, ...properties } } : card), artifactReceipt: null, colabReceipt: null })),
    checkBuild: () => {
      const state = get();
      const result = validateCardProgram(state.cards, state.mission);
      set({ activeStage: 'Check', broker: { ...state.broker, status: result.valid ? 'checked' : 'needs-attention', message: result.valid ? 'Your build passed the local check and is ready to submit.' : result.guidance[0] || 'Your build is safe; one card needs attention.' } });
      return result;
    },
    setArtifactReceipt: (artifactReceipt) => set((state) => ({ ...state, artifactReceipt, activeStage: 'Colab' })),
    setColabReceipt: (colabReceipt) => set((state) => ({ ...state, colabReceipt, activeStage: 'Reflect', broker: { ...state.broker, status: 'returned', message: 'Colab returned a verified result.' } })),
    setBroker: (broker) => set((state) => ({ ...state, broker: { ...state.broker, ...broker } })),
    setStage: (activeStage) => set({ activeStage: LEARNING_RUN_STAGES.includes(activeStage) ? activeStage : 'Build' }),
    undo: () => set((state) => {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      return { ...previous, past: state.past.slice(0, -1), future: [snapshot(state), ...state.future].slice(0, 50) };
    }),
    redo: () => set((state) => {
      if (!state.future.length) return state;
      const next = state.future[0];
      return { ...next, past: [...state.past, snapshot(state)].slice(-50), future: state.future.slice(1) };
    }),
    retryCalmly: (reason) => set((state) => ({ ...state, activeStage: state.artifactReceipt ? 'Colab' : 'Build', retry: { count: state.retry.count + 1, last_reason: String(reason || 'retry-requested'), penalized: false }, broker: { ...state.broker, status: 'retry-ready', message: 'Nothing was lost. Review the highlighted step and try again.' } })),
    reset: () => set({ ...initial, cards: createMagePrefab(), retry: { count: 0, last_reason: '', penalized: false } }),
    persist: () => persist(storage, get()),
    getPresentationState: () => {
      const state = get();
      return { activeStage: state.activeStage, mission: state.mission, cards: state.cards, profile: state.profile, artifactStatus: state.artifactReceipt ? 'validated' : 'draft', colabStatus: state.colabReceipt ? 'returned' : state.broker.status, calmMessage: state.broker.message, retry: state.retry };
    },
  }));
  store.subscribe((state) => persist(storage, state));
  return store;
}

export const learningRunStore = createLearningRunStore();
export const useLearningRunStore = (selector = (state) => state) => useStore(learningRunStore, selector);
