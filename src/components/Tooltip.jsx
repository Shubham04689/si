import React, { useState, useRef, useEffect } from 'react';
import { cn } from './IntelligencePanel';

export default function Tooltip({ children, content, shortcut, position = 'bottom', delay = 400 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef(null);
  const renderTimerRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
    renderTimerRef.current = setTimeout(() => setShouldRender(false), 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    };
  }, []);

  return (
    <div className="relative inline-flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {shouldRender && (
        <div className={cn(
          "absolute z-[1000] pointer-events-none transition-all duration-200 min-w-max",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
          position === 'bottom' ? "top-full mt-2 left-1/2 -translate-x-1/2" : "",
          position === 'top' ? "bottom-full mb-2 left-1/2 -translate-x-1/2" : "",
          position === 'left' ? "right-full mr-2 top-1/2 -translate-y-1/2" : "",
          position === 'right' ? "left-full ml-2 top-1/2 -translate-y-1/2" : ""
        )}>
          <div className="bg-[#080c14]/90 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-md shadow-xl flex items-center gap-2">
            <span className="text-[0.75rem] tracking-wide text-gray-200 font-medium font-sans">{content}</span>
            {shortcut && (
               <span className="text-[9px] font-mono text-[#5e7090] bg-white/5 px-1 rounded border border-white/5 uppercase tracking-wider">{shortcut}</span>
            )}
          </div>
          {/* Micro arrow point */}
          <div className={cn(
              "absolute w-2 h-2 bg-[#080c14]/90 border-white/10 transform rotate-45",
              position === 'bottom' ? "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-l" : "",
              position === 'top' ? "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b border-r" : "",
              position === 'left' ? "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-t border-r" : "",
              position === 'right' ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-l" : ""
          )}></div>
        </div>
      )}
    </div>
  );
}
