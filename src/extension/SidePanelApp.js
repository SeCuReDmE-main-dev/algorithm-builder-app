import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BuilderSidePanel } from '../components/ui/BuilderSidePanel';
import { PlaymatCanvas, PlaymatSlot } from '../components/ui/PlaymatCanvas';
import { CharacterSheetCard } from '../components/cards/CharacterSheetCard';
import { DeterministicDieCard } from '../components/cards/DeterministicDieCard';
import { ForceVectorCard } from '../components/cards/ForceVectorCard';
import { TrajectoryCard } from '../components/cards/TrajectoryCard';
import { VariableComparisonCard } from '../components/cards/VariableComparisonCard';
import { ModelLimitCard } from '../components/cards/ModelLimitCard';
import { TestRunCard } from '../components/cards/TestRunCard';
import { ReceiptCard } from '../components/cards/ReceiptCard';
import { buildAlgorithmArtifactReceiptV2, validateAlgorithmArtifactReceiptV2 } from '../engine/mageFirstProof';
import { learningRunStore, useLearningRunStore } from '../store/useLearningRunStore';
import { registerBuilderWebMcp } from '../webmcpTools';

registerBuilderWebMcp();

const CARD_COMPONENTS = {
  'character-sheet': CharacterSheetCard,
  'deterministic-die': DeterministicDieCard,
  'force-vector': ForceVectorCard,
  trajectory: TrajectoryCard,
  'variable-comparison': VariableComparisonCard,
  'model-limit': ModelLimitCard,
  'test-run': TestRunCard,
  receipt: ReceiptCard,
};

function cardProps(card, artifactReceipt) {
  const properties = card.properties || {};
  switch (card.type) {
    case 'character-sheet': return { heroClass: properties.role, level: properties.level, baseHealth: 'bounded' };
    case 'deterministic-die': return { seed: properties.seed, sides: properties.sides };
    case 'force-vector': return { magnitude: `(${properties.force_x}, ${properties.force_y})`, direction: 'trajectory' };
    case 'trajectory': return { target: `${properties.duration} steps` };
    case 'variable-comparison': return { baseVariable: properties.control, modifiedVariable: properties.changed };
    case 'model-limit': return { limitType: 'Scientific boundary', explanation: properties.explanation || 'Add your explanation before checking the build.' };
    case 'test-run': return { testCount: 3, passes: artifactReceipt ? artifactReceipt.local_tests.filter((test) => test.status === 'passed').length : 0 };
    case 'receipt': return { status: artifactReceipt ? 'validated' : 'draft', digest: artifactReceipt?.artifact_digest || 'Not generated yet' };
    default: return {};
  }
}

function SortableCard({ card, artifactReceipt }) {
  const sortable = useSortable({ id: card.id });
  const Component = CARD_COMPONENTS[card.type];
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };
  return (
    <div ref={sortable.setNodeRef} style={style}>
      <Component id={card.id} {...cardProps(card, artifactReceipt)} isDragging={sortable.isDragging} attributes={sortable.attributes} listeners={sortable.listeners} setNodeRef={undefined} />
    </div>
  );
}

async function extensionCommand(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response || !response.ok) throw new Error(response?.error || 'The extension command failed safely.');
  return response.data;
}

function SidePanelRuntime() {
  const state = useLearningRunStore();
  const [runtime, setRuntime] = useState({ authenticated: false, run: null, calmMessage: 'Ready when you are.' });
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    extensionCommand({ type: 'GET_RUNTIME_STATE' }).then((next) => {
      setRuntime(next);
      if (next.mission) learningRunStore.getState().setMission(next.mission);
      if (next.profile) learningRunStore.getState().setProfile(next.profile);
      if (next.run?.execution_receipt) learningRunStore.getState().setColabReceipt(next.run.execution_receipt);
    }).catch((error) => learningRunStore.getState().setBroker({ status: 'offline', message: error.message }));
    const listener = (message) => {
      if (message.type === 'RUNTIME_STATE_CHANGED') setRuntime(message.state);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const run = async (operation) => {
    setBusy(true);
    try {
      const next = await operation();
      if (next) setRuntime(next);
    } catch (error) {
      learningRunStore.getState().retryCalmly(error.message);
    } finally {
      setBusy(false);
    }
  };

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = state.cards.findIndex((card) => card.id === active.id);
    const to = state.cards.findIndex((card) => card.id === over.id);
    learningRunStore.getState().setCards(arrayMove(state.cards, from, to));
  };

  const submitArtifact = async () => {
    const check = learningRunStore.getState().checkBuild();
    if (!check.valid) return;
    const artifact = await buildAlgorithmArtifactReceiptV2({ mission: state.mission, cards: state.cards, attempt_id: `attempt-${runtime.run?.attempt || 1}` });
    learningRunStore.getState().setArtifactReceipt(artifact);
    const next = await extensionCommand({ type: 'ARTIFACT_SUBMIT', artifact });
    setRuntime(next);
  };

  const updateCard = (type, properties) => {
    const card = state.cards.find((item) => item.type === type);
    if (card) learningRunStore.getState().updateCard(card.id, properties);
  };

  const importArtifact = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !state.mission) return;
    try {
      const artifact = JSON.parse(await file.text());
      const validation = await validateAlgorithmArtifactReceiptV2(artifact, state.mission);
      if (!validation.valid) throw new Error(`Artifact rejected: ${validation.errors.join(', ')}`);
      learningRunStore.getState().setArtifactReceipt(artifact);
      const next = await extensionCommand({ type: 'ARTIFACT_SUBMIT', artifact });
      setRuntime(next);
    } catch (error) {
      learningRunStore.getState().retryCalmly(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const actions = useMemo(() => (
    <div role="group" aria-label="Mage First-Proof actions">
      <p>{state.broker.message || runtime.calmMessage}</p>
      {state.mission && <fieldset disabled={busy} aria-label="Change one variable and explain the model limit">
        <legend>Build controls</legend>
        <label>Changed horizontal force <input type="number" value={state.cards.find((card) => card.type === 'variable-comparison')?.properties.changed ?? 3} onChange={(event) => updateCard('variable-comparison', { changed: Number(event.target.value) })} /></label>
        <label>What this model cannot prove <textarea rows="3" value={state.cards.find((card) => card.type === 'model-limit')?.properties.explanation || ''} onChange={(event) => updateCard('model-limit', { explanation: event.target.value })} /></label>
        <button type="button" disabled={!state.past.length} onClick={() => learningRunStore.getState().undo()}>Undo</button>
        <button type="button" disabled={!state.future.length} onClick={() => learningRunStore.getState().redo()}>Redo</button>
      </fieldset>}
      {!runtime.authenticated && <button type="button" disabled={busy} onClick={() => run(() => extensionCommand({ type: 'AUTH_LOGIN' }))}>Sign in</button>}
      {runtime.authenticated && !runtime.run && <button type="button" disabled={busy || !state.mission} onClick={() => run(() => extensionCommand({ type: 'RUN_CREATE' }))}>Begin mission</button>}
      {runtime.run && !state.artifactReceipt && <button type="button" disabled={busy} onClick={() => run(submitArtifact)}>Check build</button>}
      {state.artifactReceipt && <button type="button" disabled={busy} onClick={() => run(() => extensionCommand({ type: 'EXPORT_ARTIFACT_JSON', artifact: state.artifactReceipt }))}>Download recovery JSON</button>}
      {state.mission && <label>Import recovery JSON <input type="file" accept="application/json,.json" disabled={busy} onChange={importArtifact} /></label>}
      {state.artifactReceipt && runtime.callbackReady && <button type="button" disabled={busy} onClick={() => run(async () => { const next = await extensionCommand({ type: 'OPEN_COLAB', run_id: runtime.run.run_id }); learningRunStore.getState().setStage('Return'); return next; })}>Open Colab</button>}
      {runtime.run && <button type="button" disabled={busy} onClick={() => run(async () => { learningRunStore.getState().setStage('Return'); return extensionCommand({ type: 'RUN_STATUS', run_id: runtime.run.run_id }); })}>Check return</button>}
      {runtime.run && <button type="button" disabled={busy} onClick={() => run(() => extensionCommand({ type: 'RUN_RETRY', run_id: runtime.run.run_id }))}>Retry without penalty</button>}
    </div>
  ), [busy, runtime, state.artifactReceipt, state.broker.message, state.mission]);

  const playmat = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={state.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <PlaymatCanvas activeCards={state.cards}>
          {state.cards.map((card) => <PlaymatSlot id={`slot-${card.id}`} key={card.id}><SortableCard card={card} artifactReceipt={state.artifactReceipt} /></PlaymatSlot>)}
        </PlaymatCanvas>
      </SortableContext>
    </DndContext>
  );

  return <BuilderSidePanel activeStage={state.activeStage} deckPalette={<span>Eight governed Mage cards</span>} playmat={playmat} actionArea={actions} missionTitle={state.mission?.mission_title || 'Mage First-Proof'} missionText={state.mission?.objective || 'Open AlgoQuest to receive the current mission.'} />;
}

const root = document.getElementById('sidepanel-root');
createRoot(root).render(<SidePanelRuntime />);
