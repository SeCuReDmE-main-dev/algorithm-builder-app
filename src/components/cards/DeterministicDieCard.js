import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Deterministic Die Card: Represents a fixed sequence or pseudo-random step with known seed.
 */
export const DeterministicDieCard = ({ 
  id,
  seed,
  sides,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Deterministic Die"
      icon="🎲"
      glowColor={ArcaneQuestTheme.colors.secondary}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex justify-between items-end border-b border-slate-700 pb-2 mb-1">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Sides (d)</span>
          <span className="font-mono text-amber-300 font-black text-lg leading-none">{sides || '6'}</span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Seed</span>
          <span className="font-mono text-amber-100 text-xs">{seed || '0xABCD'}</span>
        </div>
      </div>
      <p className="text-[11px] leading-snug mt-1 text-slate-400">
        Provides reproducible branching or traversal based on the exact seed.
      </p>
    </CardBase>
  );
};
