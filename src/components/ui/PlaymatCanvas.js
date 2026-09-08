import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArcaneQuestTheme } from '../../designTokens';
// We would import the actual draggable card wrappers here, but this is the host layout

export const PlaymatSlot = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const slotStyle = {
    minHeight: '150px',
    border: `2px dashed ${isOver ? ArcaneQuestTheme.colors.primary : ArcaneQuestTheme.colors.borderDefault}`,
    backgroundColor: isOver ? 'rgba(0, 240, 255, 0.05)' : 'transparent',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  };

  return (
    <div ref={setNodeRef} style={slotStyle} className="builder-playmat__slot p-4 flex flex-col gap-4 items-center justify-center relative">
      {!children || children.length === 0 ? (
        <span className="text-slate-500 uppercase tracking-widest text-xs font-bold pointer-events-none">
          Drop Card Here
        </span>
      ) : (
        children
      )}
    </div>
  );
};

/**
 * The main Gamified Canvas where cards are dropped.
 * Receives the ordered list of items via props from the Codex headless engine.
 */
export const PlaymatCanvas = ({ activeCards, children }) => {
  return (
    <div className="builder-playmat w-full flex-1 flex flex-col p-6 overflow-y-auto relative bg-[#050816]">
      {/* Background Star Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, ${ArcaneQuestTheme.colors.primary} 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="builder-playmat__content relative z-10 max-w-2xl mx-auto w-full flex flex-col gap-6">
        <div className="builder-playmat__title text-center mb-4">
          <h2 className="text-2xl font-black text-white tracking-wide uppercase" style={{ textShadow: ArcaneQuestTheme.shadows.glowCyan }}>
            Arcane Playmat
          </h2>
          <p className="text-slate-400 text-sm mt-1">Sequence your cards to build the artifact.</p>
        </div>

        {/* The drop zones and cards */}
        <div className="builder-playmat__slots flex flex-col gap-4 bg-slate-900/40 p-6 rounded-xl border border-slate-800 backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
};
