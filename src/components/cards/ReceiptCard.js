import React from 'react';
import { CardBase } from '../ui/CardBase';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Receipt Card: The final validation step indicating submission/Colab integration.
 */
export const ReceiptCard = ({ 
  id,
  status,
  digest,
  isDragging, 
  attributes, 
  listeners,
  setNodeRef
}) => {
  // Color based on status
  let glow = ArcaneQuestTheme.colors.textMuted;
  if (status === 'validated') glow = ArcaneQuestTheme.colors.success;
  if (status === 'pending') glow = ArcaneQuestTheme.colors.secondary;
  if (status === 'error') glow = ArcaneQuestTheme.colors.error;

  return (
    <CardBase
      title="Colab Receipt"
      icon="🧾"
      glowColor={glow}
      isDragging={isDragging}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status</span>
        <span className="text-xs uppercase tracking-wider font-black" style={{ color: glow }}>
          {status || 'Draft'}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Digest Hash</span>
        <div className="bg-black/40 border border-slate-700 rounded px-2 py-1 font-mono text-[10px] text-slate-300 break-all">
          {digest || 'Not generated yet...'}
        </div>
      </div>
      
      <p className="text-[11px] leading-snug mt-2 text-slate-400">
        Locks the algorithm artifact and prepares execution in the Colab Broker.
      </p>
    </CardBase>
  );
};
