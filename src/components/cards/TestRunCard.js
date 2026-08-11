import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Test/Run Card: Triggers a local verification sequence before Colab execution.
 */
export const TestRunCard = ({ 
  id,
  testCount,
  passes,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  const isComplete = testCount > 0 && passes === testCount;
  const glow = isComplete ? ArcaneQuestTheme.colors.success : ArcaneQuestTheme.colors.primary;

  return (
    <CardBase
      title="Local Run Test"
      icon="⚙️"
      glowColor={glow}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Local Tests</span>
        <span className="font-mono text-cyan-300 font-bold text-sm">
          {passes || 0} / {testCount || 0}
        </span>
      </div>
      
      {/* Progress bar visual */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: testCount > 0 ? `${(passes / testCount) * 100}%` : '0%',
            backgroundColor: glow
          }}
        />
      </div>

      <p className="text-[11px] leading-snug mt-3 text-slate-400">
        Executes the algorithm locally against baseline parameters to verify logic before submission.
      </p>
    </CardBase>
  );
};
