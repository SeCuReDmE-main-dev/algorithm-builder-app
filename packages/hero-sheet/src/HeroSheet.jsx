import React, { useEffect, useId, useState } from 'react';
import { HERO_SHEET_TABS, isHeroSheetProjection } from './projection.js';

const LABELS = {
  mission: 'Mission',
  hero: 'Héros',
  forge: 'Atelier',
  qbit: 'Qbit',
  journal: 'Trace',
};

const EMPTY_PROJECTION = {
  schema: 'securedme.education.algoquest.hero-sheet-projection.v1',
  revision: 0,
  run_id: 'disconnected',
  canonical_state_owner: 'algoquest',
  connection: 'disconnected',
  hero: { role: 'Héros en attente', level: 1, branch: null },
  mission: { title: 'Retrouver la planche', objective: 'Ouvre AlgoQuest pour reprendre la mission attachée à cette fiche.', status: 'disconnected', progress: 0, total: 20 },
  resources: { insight: 0, resolve: 0, retry_charges: 0 },
  inventory: [], talents: [], upgrades: [], pending_upgrade: false, upgrade_options: [],
  force: { x: 2, y: 3, duration: 6 }, simulations: [], comparison: null,
  assistance: { level: 'none', hints_used: 0, last_hint: null },
  story_points: 0,
  evidence: { local_count: 0, authenticated_count: 0, knowledge_tokens: [] },
  actions: [], recent_events: [], raw_secret_stored: false, contains_identity: false,
};

export function HeroSheet({ projection, onCommand, forge, title = 'Grimoire du héros', mode = 'embedded', busy = false, error = null }) {
  const state = isHeroSheetProjection(projection) ? projection : EMPTY_PROJECTION;
  const [tab, setTab] = useState('mission');
  const [force, setForce] = useState(state.force);
  const [reflection, setReflection] = useState('');
  const [localError, setLocalError] = useState(null);
  const tabId = useId();

  useEffect(() => setForce(state.force), [state.force.x, state.force.y, state.force.duration]);

  const send = async (type, payload = {}) => {
    if (typeof onCommand !== 'function') return;
    setLocalError(null);
    try {
      await onCommand(type, payload);
      if (type === 'RECORD_REFLECTION') setReflection('');
    } catch (commandError) {
      setLocalError(commandError instanceof Error ? commandError.message : String(commandError));
    }
  };

  const connected = state.connection === 'connected';
  const latestSimulation = state.simulations.at(-1);
  return (
    <aside className={`aq-sheet aq-sheet--${mode}`} aria-labelledby={`${tabId}-title`} data-run-id={state.run_id}>
      <header className="aq-sheet__header">
        <div className="aq-sheet__sigil" aria-hidden="true">AQ</div>
        <div className="aq-sheet__identity">
          <p className="aq-sheet__eyebrow">Algorithm Builder · fiche vivante</p>
          <h2 id={`${tabId}-title`}>{title}</h2>
          <p>{state.hero.role} · niveau {state.hero.level}</p>
        </div>
        <span className={`aq-sheet__connection aq-sheet__connection--${connected ? 'on' : 'off'}`}>{connected ? 'Liée' : 'Hors ligne'}</span>
      </header>

      <div className="aq-sheet__meters" aria-label="Ressources du héros">
        <span><b>{state.story_points}</b> renom</span>
        <span><b>{state.resources.insight}</b> intuition</span>
        <span><b>{state.resources.resolve}</b> volonté</span>
      </div>

      <div className="aq-sheet__progress" aria-label={`${state.mission.progress} activités terminées sur ${state.mission.total}`}>
        <i style={{ width: `${Math.min(100, (state.mission.progress / Math.max(1, state.mission.total)) * 100)}%` }} />
      </div>

      <nav className="aq-sheet__tabs" role="tablist" aria-label="Sections de la fiche du héros">
        {HERO_SHEET_TABS.map((name) => (
          <button key={name} id={`${tabId}-${name}`} type="button" role="tab" aria-selected={tab === name} aria-controls={`${tabId}-panel`} onClick={() => setTab(name)}>{LABELS[name]}</button>
        ))}
      </nav>

      <div className="aq-sheet__body" id={`${tabId}-panel`} role="tabpanel" aria-live="polite">
        {(error || localError) && <p className="aq-sheet__notice aq-sheet__notice--error">{error || localError}</p>}
        {!connected && <div className="aq-sheet__empty"><p>La fiche a conservé la dernière vue connue.</p><p>Rouvre la planche AlgoQuest pour poursuivre les actions de la mission.</p></div>}

        {tab === 'mission' && <section className="aq-sheet__section">
          <p className="aq-sheet__kicker">Activité {state.mission.progress + 1} / {state.mission.total}</p>
          <h3>{state.mission.title}</h3>
          <p className="aq-sheet__objective">{state.mission.objective}</p>
          <p className="aq-sheet__status">État : {state.mission.status}</p>
          {!state.hero.branch && <div className="aq-sheet__choice"><p>Quel horizon appelles-tu ?</p><button disabled={!connected || busy} onClick={() => send('CHOOSE_INTENT', { choice: 'near-horizon' })}>L’horizon proche</button><button disabled={!connected || busy} onClick={() => send('CHOOSE_INTENT', { choice: 'far-horizon' })}>L’horizon lointain</button></div>}
          {state.pending_upgrade ? <div className="aq-sheet__upgrade"><h4>Choisis ton évolution</h4>{state.upgrade_options.map((upgrade) => <button key={upgrade.id} disabled={!connected || busy} onClick={() => send('CHOOSE_UPGRADE', { upgrade_id: upgrade.id })}><b>{upgrade.label}</b><span>{upgrade.description}</span></button>)}</div> : <button className="aq-sheet__primary" disabled={!connected || busy} onClick={() => send('COMPLETE_ACTIVITY')}>Sceller cette étape</button>}
        </section>}

        {tab === 'hero' && <section className="aq-sheet__section">
          <h3>{state.hero.role}</h3>
          <dl className="aq-sheet__ledger"><div><dt>Voie</dt><dd>{state.hero.branch || 'à choisir'}</dd></div><div><dt>Niveau</dt><dd>{state.hero.level}</dd></div><div><dt>Preuves locales</dt><dd>{state.evidence.local_count}</dd></div><div><dt>Preuves attestées</dt><dd>{state.evidence.authenticated_count}</dd></div></dl>
          <h4>Talents</h4><div className="aq-sheet__chips">{state.talents.map((talent) => <span key={talent}>{talent}</span>)}</div>
          <h4>Équipement</h4><ul className="aq-sheet__inventory">{state.inventory.map((item) => <li key={item.id}><b>{item.label}</b><span>{item.description}</span></li>)}</ul>
        </section>}

        {tab === 'forge' && <section className="aq-sheet__section">
          <p className="aq-sheet__kicker">Action équipée · Force</p>
          <h3>Atelier de trajectoire</h3>
          {forge || <>
            <div className="aq-sheet__fields"><label>Force X<input type="number" min="-20" max="20" value={force.x} onChange={(event) => setForce({ ...force, x: Number(event.target.value) })} /></label><label>Force Y<input type="number" min="-20" max="20" value={force.y} onChange={(event) => setForce({ ...force, y: Number(event.target.value) })} /></label><label>Durée<input type="number" min="2" max="20" value={force.duration} onChange={(event) => setForce({ ...force, duration: Number(event.target.value) })} /></label></div>
            <div className="aq-sheet__actions"><button disabled={!connected || busy} onClick={() => send('UPDATE_FORCE', force)}>Équiper la force</button><button disabled={!connected || busy} onClick={() => send('RUN_SIMULATION')}>Lancer</button><button disabled={!connected || busy || state.simulations.length < 2} onClick={() => send('COMPARE_SIMULATIONS')}>Comparer</button></div>
          </>}
          {latestSimulation && <div className="aq-sheet__result"><b>Dernier essai</b><span>{latestSimulation.points.length} positions · X {latestSimulation.points.at(-1).x} · Y {latestSimulation.points.at(-1).y}</span></div>}
          {state.comparison && <div className="aq-sheet__result aq-sheet__result--gold"><b>Écart observé</b><span>ΔX {state.comparison.final_delta.x} · ΔY {state.comparison.final_delta.y}</span></div>}
          <label className="aq-sheet__reflection">Note de modèle<textarea value={reflection} maxLength="600" rows="4" onChange={(event) => setReflection(event.target.value)} placeholder="Ce que mon modèle montre et ce qu’il ne peut pas prouver…" /></label>
          <button disabled={!connected || busy || reflection.trim().length < 12} onClick={() => send('RECORD_REFLECTION', { text: reflection })}>Inscrire dans le grimoire</button>
        </section>}

        {tab === 'qbit' && <section className="aq-sheet__section aq-sheet__qbit"><div className="aq-sheet__qbit-mark" aria-hidden="true">Q</div><h3>Qbit</h3><p>{state.assistance.last_hint || 'Je peux éclairer la prochaine action sans remplacer ton choix.'}</p><button disabled={!connected || busy} onClick={() => send('REQUEST_HINT')}>Demander une lanterne</button><small>L’activité attribuée reste la même après une aide.</small></section>}

        {tab === 'journal' && <section className="aq-sheet__section"><h3>Trace de l’aventure</h3><ol className="aq-sheet__journal">{state.recent_events.slice().reverse().map((event) => <li key={event.event_id || event.id}><span>{String(event.type || '').replaceAll('_', ' ')}</span><small>révision {event.revision || 1}</small></li>)}</ol></section>}
      </div>
    </aside>
  );
}
