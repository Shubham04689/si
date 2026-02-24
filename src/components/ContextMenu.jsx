import React, { useEffect, useRef } from 'react';
import { Edit2, Plus, Link as LinkIcon, Trash2 } from 'lucide-react';

export default function ContextMenu({ x, y, isOpen, onClose, node, onAction }) {
  const menuRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't close if clicking inside the menu
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    // Prevent context menu on the context menu itself
    const handleContextMenu = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) {
        e.preventDefault();
      }
    };
    
    // Close on escape key
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
       // Timeout ensures that the click that opened the menu doesn't immediately close it
       timerRef.current = setTimeout(() => {
         document.addEventListener('mousedown', handleClickOutside);
       }, 10);
       document.addEventListener('contextmenu', handleContextMenu);
       document.addEventListener('keydown', handleEsc);
    }
    return () => {
       clearTimeout(timerRef.current);
       document.removeEventListener('mousedown', handleClickOutside);
       document.removeEventListener('contextmenu', handleContextMenu);
       document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !node) return null;

  const actions = [
    { id: 'edit', label: 'Edit Node', icon: Edit2, shortcut: 'E' },
    { id: 'add_child', label: 'Add Connection', icon: Plus, shortcut: 'A' },
    { id: 'link_existing', label: 'Link Existing', icon: LinkIcon, shortcut: 'L' },
    { id: 'delete', label: 'Destroy Node', icon: Trash2, shortcut: 'Del', destructive: true },
  ];

  // Keep menu within viewport bounds
  const safeX = Math.min(x, window.innerWidth - 240);
  const safeY = Math.min(y, window.innerHeight - 200);

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] w-52 bg-[#080c14]/80 backdrop-blur-[30px] border border-white/10 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{ top: safeY, left: safeX }}
    >
      <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#5e7090] truncate">{node.label || node.id}</p>
      </div>
      <div className="p-1.5 flex flex-col gap-0.5">
        {actions.map((action, idx) => (
          <button
            key={action.id}
            onClick={(e) => {
                e.stopPropagation();
                onAction(action.id, node);
                onClose();
            }}
            className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-[0.85rem] font-sans transition-colors group ${
              action.destructive 
                ? 'text-red-400 hover:bg-red-500/15 hover:text-red-300 active:bg-red-500/20' 
                : 'text-gray-300 hover:bg-white/10 hover:text-white active:bg-white/15'
            }`}
             style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-2.5">
               <action.icon size={14} className={action.destructive ? "text-red-400/80 group-hover:text-red-300" : "text-gray-500 group-hover:text-[#a855f7] transition-colors"} />
               <span>{action.label}</span>
            </div>
            {action.shortcut && (
               <span className="text-[9px] font-mono text-[#5e7090] tracking-widest bg-white/[0.03] px-1 rounded">{action.shortcut}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
