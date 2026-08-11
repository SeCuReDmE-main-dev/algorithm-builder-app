import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Character Sheet Card: Represents the initial state or input data bounds.
 */
export const CharacterSheetCard = ({ 
  id,
  heroClass,
  level,
  baseHealth,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  return (
    <CardBase
      title="Character Sheet"
      icon="📜"
      glowColor="#10b981" // Emerald success color
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex flex-col gap-2 border-b border-slate-700 pb-2 mb-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Class</span>
          <span className="font-bold text-emerald-300 text-sm">{heroClass || 'Mage'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Level</span>
          <span className="font-mono text-emerald-100 text-sm">{level || '1'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Base HP</span>
          <span className="font-mono text-emerald-100 text-sm">{baseHealth || '100'}</span>
        </div>
      </div>
      <p className="text-[11px] leading-snug mt-1 text-slate-400">
        Defines the initial state vector and attribute boundaries for the sequence.
      </p>
    </CardBase>
  );
};
