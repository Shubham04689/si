import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Plus } from 'lucide-react';

export default function AddNodeDialog({ isOpen, x, y, parentNode, onClose, onSubmit, onAIGenerate, isGenerating }) {
    const [label, setLabel] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setLabel("");
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen || !parentNode) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (label.trim()) {
            onSubmit(parentNode, label.trim());
            setLabel("");
        }
    };

    // Keep dialog within screen bounds
    const dialogX = Math.min(x, window.innerWidth - 300);
    const dialogY = Math.min(y, window.innerHeight - 150);

    return (
        <div 
            className="fixed z-50 bg-[#0c1220]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden w-[280px]"
            style={{ left: dialogX + 15, top: dialogY }}
        >
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                <span className="text-xs font-medium text-gray-300">Add branch to <span className="text-white">"{parentNode.label}"</span></span>
                <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors rounded-md hover:bg-white/10">
                    <X size={14} />
                </button>
            </div>
            
            <div className="p-3">
                <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
                    <input 
                        ref={inputRef}
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Topic name..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        disabled={isGenerating}
                    />
                    <button 
                        type="submit"
                        disabled={!label.trim() || isGenerating}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center"
                    >
                        <Plus size={16} />
                    </button>
                </form>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest text-gray-500">
                        <span className="bg-[#0c1220] px-2">OR</span>
                    </div>
                </div>

                <button
                    onClick={() => onAIGenerate(parentNode)}
                    disabled={isGenerating}
                    className="mt-3 w-full group relative flex items-center justify-center gap-2 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 text-[#d8b4fe] py-2 rounded-lg text-sm font-medium transition-all overflow-hidden disabled:opacity-60"
                >
                    {isGenerating ? (
                        <div className="flex items-center gap-2 animate-pulse">
                            <Sparkles size={14} className="animate-spin-slow" />
                            Synthesizing...
                        </div>
                    ) : (
                        <>
                            <Sparkles size={14} className="text-[#a855f7] group-hover:scale-110 transition-transform" />
                            Generate with AI
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
