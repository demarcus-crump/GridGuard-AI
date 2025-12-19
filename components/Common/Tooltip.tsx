
import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  width?: string;
  position?: 'top' | 'bottom'; // Simplified for now
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '', width = 'w-64', position = 'top' }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className={`${show ? 'cursor-help' : ''}`}>
        {children}
      </div>
      
      {show && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-150 ${position === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} ${width}`}>
          <div className="bg-[#05090e]/95 backdrop-blur-md border border-[var(--status-info)] text-[var(--text-primary)] text-xs p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
            {/* HUD Decoration: Corner Brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--status-info)] opacity-70"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--status-info)] opacity-70"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--status-info)] opacity-70"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--status-info)] opacity-70"></div>
            
            {/* Pointer Arrow */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#05090e] border-r border-b border-[var(--status-info)] rotate-45 ${position === 'top' ? '-bottom-1.5' : '-top-1.5 rotate-[225deg]'}`}></div>
            
            <div className="font-mono leading-relaxed relative z-10 text-left">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
