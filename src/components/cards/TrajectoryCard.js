import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Trajectory Card: Represents a sequence or path algorithmic step.
 */
export const TrajectoryCard = ({ 
  id,
  target,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Trajectory"
      icon="☄️"
      glowColor={ArcaneQuestTheme.colors.accent}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-slate-400 font-bold">Target Vector</span>
        <div className="bg-black/40 border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300">
          {target || 'Unassigned'}
        </div>
      </div>
      <p className="text-[11px] leading-snug mt-2 text-slate-400">
        Calculates the optimal path toward the defined target vector over N steps.
      </p>
    </CardBase>
  );
};
