import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Force/Vector Card: Represents a magnitude and direction application in the algorithm.
 */
export const ForceVectorCard = ({ 
  id,
  magnitude,
  direction,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Force Vector"
      icon="⚡"
      glowColor={ArcaneQuestTheme.colors.primary}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Magnitude</span>
          <div className="bg-black/40 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300 text-center">
            {magnitude || '0.0'}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Direction</span>
          <div className="bg-black/40 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300 text-center">
            {direction || '0°'}
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-snug mt-2 text-slate-400">
        Applies a directional force to shift the local solution space.
      </p>
    </CardBase>
  );
};
