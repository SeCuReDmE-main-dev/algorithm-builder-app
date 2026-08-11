import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Model Limit Explanation Card: Highlights constraints of the learning model.
 */
export const ModelLimitCard = ({ 
  id,
  limitType,
  explanation,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Model Limit"
      icon="⚠️"
      glowColor={ArcaneQuestTheme.colors.secondary} // Gold warning
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex flex-col gap-1 mb-2">
        <span className="text-[10px] uppercase tracking-wider text-amber-500 font-bold">Constraint Boundary</span>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-200">
          {limitType || 'Hardware limit reached'}
        </div>
      </div>
      <p className="text-[11px] leading-snug text-slate-400 italic">
        "{explanation || 'This model cannot accurately project beyond these dimensions without hallucination.'}"
      </p>
    </CardBase>
  );
};
