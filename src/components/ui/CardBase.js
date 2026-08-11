import React from 'react';
import { ArcaneQuestTheme } from '../../designTokens';

/**
 * Base visual component for all Arcane Quest cards.
 * Accepts drag listeners, dragging state, and visual props.
 */
export const CardBase = ({ 
  title, 
  icon, 
  children, 
  isDragging, 
  isOver,
  glowColor = ArcaneQuestTheme.colors.primary, 
  attributes, 
  listeners,
  setNodeRef,
  className = ''
}) => {
  const baseStyle = {
    backgroundColor: ArcaneQuestTheme.colors.surface,
    border: `1px solid ${isDragging ? glowColor : ArcaneQuestTheme.colors.borderDefault}`,
    boxShadow: isDragging ? `0 0 20px ${glowColor}80` : '0 4px 6px rgba(0,0,0,0.3)',
    color: ArcaneQuestTheme.colors.textMain,
    backdropFilter: 'blur(12px)',
    transition: 'all 0.2s ease-in-out',
    opacity: isDragging ? 0.8 : 1,
    transform: isDragging ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
    zIndex: isDragging ? 50 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const headerStyle = {
    borderBottom: `1px solid ${ArcaneQuestTheme.colors.borderDefault}`,
    backgroundColor: ArcaneQuestTheme.colors.surfaceHighlight,
    color: glowColor
  };

  return (
    <div 
      ref={setNodeRef}
      style={baseStyle}
      className={`rounded-lg overflow-hidden flex flex-col w-64 min-h-[140px] relative ${className}`}
      {...attributes}
      {...listeners}
    >
      {/* Glow highlight on hover/over */}
      {isOver && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ boxShadow: `inset 0 0 15px ${glowColor}50` }} 
        />
      )}

      <div style={headerStyle} className="px-3 py-2 flex items-center justify-between font-bold text-sm tracking-wider uppercase">
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </span>
      </div>
      
      <div className="p-3 flex-1 flex flex-col gap-2 text-sm text-slate-300">
        {children}
      </div>
    </div>
  );
};
