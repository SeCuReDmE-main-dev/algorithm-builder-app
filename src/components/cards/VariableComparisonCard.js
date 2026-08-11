import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Change-One-Variable Comparison Card: Teaches control variables.
 */
export const VariableComparisonCard = ({ 
  id,
  baseVariable,
  modifiedVariable,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Variable Compare"
      icon="⚖️"
      glowColor={ArcaneQuestTheme.colors.accent}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="grid grid-cols-2 gap-2 text-center border-b border-slate-700 pb-2 mb-1">
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Control</span>
          <span className="font-mono text-slate-300 text-xs bg-black/40 px-2 py-0.5 rounded">{baseVariable || 'x = 10'}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-amber-500 font-bold mb-1">Test</span>
          <span className="font-mono text-amber-200 text-xs bg-black/40 px-2 py-0.5 rounded">{modifiedVariable || 'x = 20'}</span>
        </div>
      </div>
      <p className="text-[11px] leading-snug mt-1 text-slate-400">
        Changes exactly one parameter to isolate effects on the output trajectory.
      </p>
    </CardBase>
  );
};
