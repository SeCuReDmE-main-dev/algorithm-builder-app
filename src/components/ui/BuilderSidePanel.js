import React from 'react';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * The top-level presentation component for the MV3 Side Panel.
 * Designed specifically for narrow constrained widths (e.g. 350px).
 */
export const BuilderSidePanel = ({
  activeStage, // 'Mission', 'Build', 'Check', 'Colab', 'Return', 'Reflect'
  deckPalette, // ReactNode containing the available cards
  playmat,     // ReactNode containing the PlaymatCanvas and active cards
  actionArea,  // ReactNode containing action buttons (Test, Run, etc)
  missionTitle,
  missionText
}) => {
  return (
    <div 
      className="flex flex-col h-screen w-full bg-[#050816] text-slate-200 font-sans overflow-hidden border-l"
      style={{ borderColor: ArcaneQuestTheme.colors.borderGlow }}
    >
      {/* Header Area */}
      <header className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur shrink-0 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black uppercase tracking-wider" style={{ color: ArcaneQuestTheme.colors.primary, textShadow: ArcaneQuestTheme.shadows.glowCyan }}>
            Arcane Forge
          </h1>
          <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {activeStage} Phase
          </div>
        </div>
        <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-1">{missionTitle || 'Current Mission'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {missionText || 'Select cards from your deck and arrange them on the playmat to build the artifact.'}
          </p>
        </div>
      </header>

      {/* Deck / Palette Area (Scrollable Horizontally or Grid) */}
      <section className="shrink-0 p-4 border-b border-slate-800 bg-slate-900/30 shadow-inner">
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Your Deck</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
          {deckPalette}
        </div>
      </section>

      {/* Playmat Area (Scrollable Vertically) */}
      <section className="flex-1 overflow-y-auto relative bg-[#080b1a] shadow-inner">
        {playmat}
      </section>

      {/* Action Footer */}
      <footer className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur shrink-0">
        {actionArea}
      </footer>
    </div>
  );
};
