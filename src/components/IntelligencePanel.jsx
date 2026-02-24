import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, FileText, ExternalLink, BarChart2, AlertTriangle, MessageSquare, Layers, Plus, Save, Edit2, Link as LinkIcon, ChevronRight, Activity, GitCommit, Search, Sparkles, SlidersHorizontal, Maximize2, Minimize2, Shuffle, FileType } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactMarkdown from 'react-markdown';
import { generateJSONCompletion } from '../utils/aiEngine';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IntelligencePanel({ node, isOpen, onClose, isEditMode, onUpdateNode, onAddChildNode, onAddLink, onRemoveLink, onNavigateToNode, allNodes = [], connectedNodeIds = new Set() }) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [childForm, setChildForm] = useState({ label: '', summary: '', relation: 'Connects to', strength: 5 });
  const [showChildForm, setShowChildForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ targetId: '', relation: 'Connects to', strength: 5 });
  
  const [activeTab, setActiveTab] = useState('Overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const [panelWidth, setPanelWidth] = useState(450);
  const isResizing = useRef(false);
  const scrollRef = useRef(null);
  const scrollPositions = useRef({ Overview: 0, Network: 0, Builder: 0 });

  const availableNodes = useMemo(
    () => allNodes.filter(n => n.id !== node?.id && !connectedNodeIds.has(n.id)),
    [allNodes, node?.id, connectedNodeIds]
  );

  const handleMouseMoveResize = useRef(null);
  const handleMouseUpResize = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!isOpen || isEditingContent) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Escape') {
           onClose();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const tabs = ['Overview', 'Network'];
            if (isEditMode) tabs.push('Builder');
            const currentIndex = tabs.indexOf(activeTab);
            if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
            if (e.key === 'ArrowLeft' && currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, isEditMode, isEditingContent, onClose]);

  const handleMouseDownResize = (e) => {
    isResizing.current = true;
    
    handleMouseMoveResize.current = (evt) => {
      if (!isResizing.current) return;
      const newWidth = document.body.clientWidth - evt.clientX;
      if (newWidth >= 300 && newWidth <= 800) setPanelWidth(newWidth);
    };
    
    handleMouseUpResize.current = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMoveResize.current);
      document.removeEventListener('mouseup', handleMouseUpResize.current);
    };

    document.addEventListener('mousemove', handleMouseMoveResize.current);
    document.addEventListener('mouseup', handleMouseUpResize.current);
  };

  const handleScroll = (e) => {
    scrollPositions.current[activeTab] = e.target.scrollTop;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isEditMode) {
      setIsEditingContent(false);
      setShowChildForm(false);
      setShowLinkForm(false);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (node) {
      setEditForm({
        label: node.label || '',
        summary: node.content?.summary || '',
        key_insight: node.content?.key_insight || '',
        notes: node.content?.notes || '',
        sub_topics: (node.content?.sub_topics || []).join('\n'),
        challenges: (node.content?.challenges || []).join('\n')
      });
      setIsEditingContent(false);
      setShowChildForm(false);
      setShowLinkForm(false);
      setAiSuggestions([]);
      setActiveTab('Overview');
      setIsCollapsed(false);
    }
  }, [node]);

  const handleGenerateSuggestions = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const unconnected = allNodes.filter(n => n.id !== node?.id && !connectedNodeIds.has(n.id));
      const shuffled = [...unconnected].sort(() => 0.5 - Math.random());
      setAiSuggestions(shuffled.slice(0, 4));
      setIsGenerating(false);
    }, 1000);
  };

  const handleSaveEdit = () => {
    if (!node || !onUpdateNode) return;
    const updatedNode = {
      ...node,
      label: editForm.label,
      content: {
        ...node.content,
        summary: editForm.summary,
        key_insight: editForm.key_insight,
        notes: editForm.notes,
        sub_topics: editForm.sub_topics ? editForm.sub_topics.split('\n').map(s => s.trim()).filter(Boolean) : [],
        challenges: editForm.challenges ? editForm.challenges.split('\n').map(s => s.trim()).filter(Boolean) : []
      }
    };
    onUpdateNode(updatedNode);
    setIsEditingContent(false);
  };

  const handleAutoFillIntel = async () => {
      setIsAutoFilling(true);
      const systemPrompt = `You are an elite Strategic Intelligence Analyst. Generate comprehensive intelligence for the given topic.
You must return a raw JSON object with exactly these keys:
- "summary": A concise 2-3 sentence executive summary.
- "key_insight": A single hard-hitting analytic insight.
- "notes": Detailed markdown notes providing full context, historical drivers, and deep-dive logic.
- "sub_topics": An array of strings representing relevant topics to explore further, acting as potential new branches.
- "challenges": An array of strings representing further questions, structural challenges, or unresolved issues to investigate.`;

      try {
          const res = await generateJSONCompletion(systemPrompt, `Topic: ${editForm.label || node.label}\nProvide the intelligence as valid JSON.`);
          setEditForm(prev => ({
              ...prev,
              summary: res.summary || prev.summary,
              key_insight: res.key_insight || prev.key_insight,
              notes: res.notes || prev.notes,
              sub_topics: (res.sub_topics || []).join('\n'),
              challenges: (res.challenges || []).join('\n')
          }));
      } catch (err) {
          alert("Failed to auto-fill intelligence. Ensure AI Provider is connected and supports JSON format.");
      }
      setIsAutoFilling(false);
  };

  const handleAddChild = () => {
    if (!node || !onAddChildNode || !childForm.label) return;
    
    let newType = 'peripheral_topic';
    let group = 3;
    let size = 15;

    if (node.type === 'macro' || node.type === 'central_hub') {
      newType = 'trend';
      group = 2;
      size = 25;
    } else if (node.type === 'trend' || node.type === 'key_driver' || node.type === 'lifecycle' || node.type === 'concept') {
      newType = 'issue';
      group = 3;
      size = 15;
    }

    const newNodeId = childForm.label.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    
    const newNode = {
      id: newNodeId,
      label: childForm.label,
      type: newType,
      group: group,
      size: size,
      content: {
        summary: childForm.summary,
        key_insight: '',
        metrics: [],
        sub_topics: [],
        challenges: [],
        expert_quotes: [],
        related_reports: []
      }
    };

    onAddChildNode(newNode, childForm.relation, parseInt(childForm.strength, 10));
    setShowChildForm(false);
    setChildForm({ label: '', summary: '', relation: 'Connects to', strength: 5 });
  };

  const getTypeColor = (type) => {
    if (type === 'macro' || type === 'central_hub') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (type === 'risk') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (type === 'history') return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const TypeDot = ({type}) => {
    const c = type === 'macro' ? 'bg-amber-400' : type === 'risk' ? 'bg-red-400' : type === 'history' ? 'bg-purple-400' : 'bg-blue-400';
    return <div className={`w-1.5 h-1.5 rounded-full ${c} mr-1.5`}></div>;
  };

  if (!node && !isOpen) return null;

  return (
    <div 
      className={cn(
          "fixed top-14 right-0 h-[calc(100vh-56px)] bg-[#080c14]/80 backdrop-blur-[30px] backdrop-saturate-150 border-l border-white/5 shadow-2xl flex flex-col z-40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen ? "translate-x-0" : "translate-x-[110%]"
      )}
      style={{ width: isCollapsed ? 64 : panelWidth }}
    >
      
      {/* Drag Handle */}
      {!isCollapsed && (
        <div 
          className="absolute top-0 left-0 w-2.5 h-full -ml-[1px] cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-50 flex items-center justify-center group"
          onMouseDown={handleMouseDownResize}
        >
           <div className="h-8 w-0.5 bg-white/10 group-hover:bg-blue-400 rounded-full transition-colors"></div>
        </div>
      )}

      {/* Icon Rail Mode (Collapsed) */}
      {isCollapsed && (
        <div className="flex flex-col items-center py-6 gap-6 h-full border-l border-white/5">
           <button onClick={() => setIsCollapsed(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
             <Maximize2 size={16} />
           </button>
           <div className="w-8 h-px bg-white/10"></div>
           <button onClick={() => { setIsCollapsed(false); setActiveTab('Overview'); }} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all" title="Overview">
             <FileText size={20} />
           </button>
           <button onClick={() => { setIsCollapsed(false); setActiveTab('Network'); }} className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all" title="Network & Links">
             <Layers size={20} />
           </button>
           {isEditMode && (
             <button onClick={() => { setIsCollapsed(false); setActiveTab('Builder'); }} className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-all" title="Builder Mode">
               <Edit2 size={20} />
             </button>
           )}
           <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all mt-auto mb-4" title="Close Panel">
             <X size={20} />
           </button>
        </div>
      )}

      {/* Expanded Mode */}
      {!isCollapsed && node && (
        <>
          {/* Header Area */}
          <div className="px-6 pt-6 pb-4 border-b border-white/5 flex-shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[0.6rem] font-mono text-gray-500 uppercase tracking-widest mb-4">
              <span>Map Core</span>
              <ChevronRight size={10} />
              <span>{node.type || 'Topic'}</span>
              <ChevronRight size={10} />
              <span className="text-gray-400 truncate max-w-[150px]">{node.label}</span>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border text-[0.6rem] font-mono uppercase tracking-widest mb-3", getTypeColor(node.type))}>
                  <TypeDot type={node.type} />
                  {node.viewType === 'history' ? 'Historical Context' : node.type?.replace(/_/g, ' ') || 'Topic'}
                  <span className="ml-2 pl-2 border-l border-current opacity-60">Lvl {node.group || 1}</span>
                </span>
                
                {isEditMode && isEditingContent ? (
                    <input 
                      type="text" 
                      value={editForm.label}
                      onChange={(e) => setEditForm({...editForm, label: e.target.value})}
                      className="w-full bg-[#131a28] border border-white/10 rounded p-2 text-2xl font-light text-white mb-2 font-display focus:border-amber-500/50 outline-none"
                    />
                ) : (
                    <h2 className="text-3xl font-light text-white leading-tight font-display tracking-wide">{node.label}</h2>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                <button 
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 text-gray-400 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg transition-all"
                  title="Collapse Panel"
                >
                  <Minimize2 size={16} />
                </button>
                {isEditMode && (
                  <button 
                    onClick={() => isEditingContent ? handleSaveEdit() : setIsEditingContent(true)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isEditingContent ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                    title={isEditingContent ? "Save Changes" : "Edit Details"}
                  >
                    {isEditingContent ? <Save size={16} /> : <Edit2 size={16} />}
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-red-400 bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 rounded-lg transition-all ml-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 mt-6 border-b border-white/5 relative">
              {['Overview', 'Network', ...(isEditMode ? ['Builder'] : [])].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-3 text-xs font-mono uppercase tracking-widest transition-colors relative",
                    activeTab === tab ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 pb-20 custom-scrollbar"
          >
            
            {activeTab === 'Overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                {isEditMode && isEditingContent && (
                  <div className="flex justify-end border-b border-white/5 pb-4">
                     <button 
                         onClick={handleAutoFillIntel}
                         disabled={isAutoFilling}
                         className="flex items-center gap-2 px-4 py-2 bg-[#a855f7]/10 hover:bg-[#a855f7]/20 text-[#d8b4fe] border border-[#a855f7]/30 rounded-lg transition-all disabled:opacity-50 text-xs font-medium w-full justify-center"
                     >
                         <Sparkles size={14} className={isAutoFilling ? "animate-spin-slow" : ""} />
                         {isAutoFilling ? "Synthesizing Node Intelligence..." : "Auto-Fill Intelligence with AI"}
                     </button>
                  </div>
                )}

                {/* 1. Executive Summary */}
                {(node.content?.summary || isEditingContent) && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase flex items-center gap-2">
                          <FileText size={12} className="text-blue-400" /> Executive Summary
                        </h3>
                    </div>
                    {isEditMode && isEditingContent ? (
                        <textarea 
                          value={editForm.summary}
                          onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                          className="w-full h-24 bg-[#131a28] border border-white/10 rounded-lg p-3 text-sm text-gray-300 resize-none font-sans focus:outline-none focus:border-amber-500/50"
                          placeholder="Analysis of this concept..."
                        />
                    ) : (
                        <div className="text-gray-300 text-[0.85rem] leading-[1.7] tracking-wide">
                            <ReactMarkdown components={{p: React.Fragment, strong: ({node, ...props}) => <strong className="font-semibold text-gray-200" {...props} />}}>{node.content.summary?.replace(/\\n/g, '\n') || ''}</ReactMarkdown>
                        </div>
                    )}
                  </section>
                )}

                {/* 1.5 Detailed Context Notes */}
                {(node.content?.notes || isEditingContent) && (
                  <section className="border-t border-white/5 pt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase flex items-center gap-2">
                          <FileType size={12} className="text-emerald-400" /> Comprehensive Briefing
                        </h3>
                    </div>
                    {isEditMode && isEditingContent ? (
                        <textarea 
                          value={editForm.notes}
                          onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                          className="w-full h-80 bg-[#131a28] border border-white/10 rounded-lg p-4 text-sm text-gray-300 resize-y font-sans leading-relaxed focus:outline-none focus:border-emerald-500/50 custom-scrollbar"
                          placeholder="Full contextual notes, historical drivers, and deep-dive logic..."
                        />
                    ) : (
                        <div className="text-gray-300 text-[0.85rem] leading-[1.7] tracking-wide pb-4">
                            <ReactMarkdown 
                              components={{
                                h2: ({node, ...props}) => <h2 className="text-white font-medium text-[0.95rem] mt-5 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-emerald-400 font-mono text-xs uppercase mt-4 mb-2" {...props} />,
                                p: ({node, ...props}) => <p className="mb-3" {...props} />,
                                ul: ({node, ...props}) => <ul className="pl-5 list-disc space-y-1 mb-3 text-gray-400" {...props} />,
                                li: ({node, ...props}) => <li {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-gray-200" {...props} />
                              }}
                            >
                               {node.content.notes?.replace(/\\n/g, '\n') || ''}
                            </ReactMarkdown>
                        </div>
                    )}
                  </section>
                )}

                {/* 2. Key Insight (Highlighted block) */}
                {node.content?.key_insight && (
                  <section className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden group hover:bg-blue-500/10 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    <h3 className="text-[10px] font-mono tracking-widest text-blue-400/80 uppercase mb-3">Key Insight</h3>
                    {isEditMode && isEditingContent ? (
                        <textarea 
                          value={editForm.key_insight}
                          onChange={(e) => setEditForm({...editForm, key_insight: e.target.value})}
                          className="w-full h-24 bg-[#131a28]/50 border border-white/5 rounded-lg p-3 text-[0.9rem] italic text-blue-200 resize-none font-display focus:outline-none focus:border-amber-500/50"
                        />
                    ) : (
                        <p className="text-blue-100/90 text-[1.05rem] font-display italic leading-snug tracking-wide">
                          "<ReactMarkdown components={{p: React.Fragment, strong: ({node, ...props}) => <strong className="font-semibold text-white/90" {...props} />}}>{node.content.key_insight?.replace(/\\n/g, '\n') || ''}</ReactMarkdown>"
                        </p>
                    )}
                  </section>
                )}

                {/* 3. Key Metrics (Grid Layout) */}
                {node.content?.metrics && node.content.metrics.length > 0 && (
                   <section>
                     <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2">
                       <BarChart2 size={12} className="text-emerald-400" /> Key Data Points
                     </h3>
                     <div className="grid grid-cols-2 gap-3">
                        {node.content.metrics.map((metric, idx) => (
                           <div key={idx} className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-[#5e7090] mb-1.5 line-clamp-1">{metric.label}</p>
                              <p className="text-xl font-medium text-emerald-400 tabular-nums tracking-tight">{metric.value}</p>
                           </div>
                        ))}
                     </div>
                   </section>
                )}

                {/* 5. Challenges / Further Questions */}
                {((node.content?.challenges && node.content.challenges.length > 0) || isEditingContent) && (
                   <section>
                      <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2">
                        <AlertTriangle size={12} className="text-amber-400" /> Further Questions to Explore
                      </h3>
                      {isEditMode && isEditingContent ? (
                          <textarea 
                            value={editForm.challenges}
                            onChange={(e) => setEditForm({...editForm, challenges: e.target.value})}
                            className="w-full h-24 bg-[#131a28] border border-white/10 rounded-lg p-3 text-[0.85rem] text-gray-300 resize-none font-sans focus:outline-none focus:border-amber-500/50 leading-relaxed"
                            placeholder="Enter further questions or challenges (one per line)..."
                          />
                      ) : (
                          <ul className="space-y-2.5">
                             {node.content.challenges.map((challenge, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-[0.82rem] text-gray-300 leading-relaxed">
                                   <span className="text-amber-500/50 mt-[3px] text-xs">◆</span>
                                   <span className="flex-1"><ReactMarkdown components={{p: React.Fragment, strong: ({node, ...props}) => <strong className="font-semibold text-amber-100" {...props} />}}>{challenge.replace(/\\n/g, '\n')}</ReactMarkdown></span>
                                </li>
                             ))}
                          </ul>
                      )}
                   </section>
                )}
                
                {/* 6. Expert Quotes */}
                {node.content?.expert_quotes && node.content.expert_quotes.length > 0 && (
                   <section>
                      <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2">
                        <MessageSquare size={12} className="text-pink-400" /> Expert Perspectives
                      </h3>
                      <div className="space-y-4">
                         {node.content.expert_quotes.map((quoteObj, idx) => (
                            <blockquote key={idx} className="border-l-[3px] border-white/10 pl-4 py-1">
                               <p className="text-[0.85rem] text-gray-300 italic mb-2.5 leading-relaxed font-sans">"{quoteObj.quote}"</p>
                               <footer className="text-[10px] font-mono uppercase tracking-widest text-[#5e7090]">— {quoteObj.author}</footer>
                            </blockquote>
                         ))}
                      </div>
                   </section>
                )}
              </div>
            )}

            {activeTab === 'Network' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                {/* 4. Sub-Topics / Related Concepts */}
                {((node.content?.sub_topics && node.content.sub_topics.length > 0) || isEditingContent) && (
                   <section>
                      <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2">
                        <Layers size={12} className="text-purple-400" /> Relevant Topics to Explore
                      </h3>
                      {isEditMode && isEditingContent ? (
                          <textarea 
                            value={editForm.sub_topics}
                            onChange={(e) => setEditForm({...editForm, sub_topics: e.target.value})}
                            className="w-full h-24 bg-[#131a28] border border-white/10 rounded-lg p-3 text-[0.85rem] text-gray-300 resize-none font-sans focus:outline-none focus:border-purple-500/50 leading-relaxed"
                            placeholder="Enter relevant topics to explore (one per line)..."
                          />
                      ) : (
                          <div className="flex flex-wrap gap-2">
                             {node.content.sub_topics.map((topic, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white/5 text-gray-300 border border-white/5 rounded-full text-[0.7rem] font-medium hover:bg-white/10 hover:border-white/10 hover:text-white transition-all cursor-default">
                                   <ReactMarkdown components={{p: React.Fragment}}>{topic.replace(/\\n/g, '\n')}</ReactMarkdown>
                                </span>
                             ))}
                          </div>
                      )}
                   </section>
                )}

                {/* Connected Nodes List */}
                <section>
                  <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2">
                    <Activity size={12} className="text-blue-400" /> Network Topology
                  </h3>
                  {connectedNodeIds.size === 0 ? (
                    <p className="text-xs text-gray-500 italic">No direct connections to other nodes.</p>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(connectedNodeIds).map(id => {
                        const conn = allNodes.find(n => n.id === id);
                        if (!conn) return null;
                        return (
                          <div 
                            key={id} 
                            onClick={() => onNavigateToNode(conn)}
                            className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-lg hover:bg-white/[0.04] hover:border-blue-500/30 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5">
                              <TypeDot type={conn.type} />
                              <span className="text-[0.8rem] text-gray-300 group-hover:text-blue-400 transition-colors">{conn.label}</span>
                            </div>
                            <span className="text-[9px] font-mono text-[#5e7090] uppercase tracking-wider">{conn.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
                
                {/* 7. Related Reports */}
                {node.content?.related_reports && node.content.related_reports.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-mono tracking-widest text-[#5e7090] uppercase mb-3 flex items-center gap-2 border-t border-white/5 pt-6">
                      <ExternalLink size={12} className="text-gray-400"/> Deep Dive Reports
                    </h3>
                    <ul className="space-y-2.5">
                      {node.content.related_reports.map((report, idx) => (
                        <li key={idx}>
                          <a 
                            href={report.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex flex-col p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all"
                          >
                            <span className="text-[0.8rem] text-gray-300 group-hover:text-blue-400 transition-colors flex items-start justify-between gap-2">
                              {report.title}
                              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'Builder' && isEditMode && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                <p className="text-xs text-[#5e7090] mb-4">Modify the architecture of this specific map cluster.</p>
                
                {/* Action Choice Buttons */}
                {!showChildForm && !showLinkForm && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowChildForm(true)}
                      className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-xl transition-colors font-medium text-xs text-center"
                    >
                      <Plus size={20} className="mb-1" /> 
                      {node.type === 'macro' || node.type === 'central_hub' ? 'Add Core Concept' : 'Add Satellite Topic'}
                    </button>
                    <button 
                      onClick={() => setShowLinkForm(true)}
                      className="flex-1 flex flex-col items-center justify-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-xl transition-colors font-medium text-xs text-center"
                    >
                      <LinkIcon size={20} className="mb-1" /> 
                      Link Existing Node
                    </button>
                  </div>
                )}

                {/* Flow 1: Add New Node Form */}
                {showChildForm && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-mono tracking-widest uppercase text-amber-400 flex items-center justify-between">
                      New Child Node
                      <button onClick={() => setShowChildForm(false)} className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10"><X size={14}/></button>
                    </h3>
                    
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Node Identifier</label>
                      <input 
                        type="text" 
                        value={childForm.label}
                        onChange={(e) => setChildForm({...childForm, label: e.target.value})}
                        className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        placeholder="e.g. Natural Language Processing"
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Summary (Optional)</label>
                      <textarea 
                        value={childForm.summary}
                        onChange={(e) => setChildForm({...childForm, summary: e.target.value})}
                        className="w-full h-20 bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-gray-300 resize-none focus:outline-none focus:border-amber-500/50"
                        placeholder="Short description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Edge Label</label>
                        <input 
                          type="text" 
                          value={childForm.relation}
                          onChange={(e) => setChildForm({...childForm, relation: e.target.value})}
                          className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Gravity (1-10)</label>
                        <input 
                          type="number" 
                          min="1" max="10"
                          value={childForm.strength}
                          onChange={(e) => setChildForm({...childForm, strength: e.target.value})}
                          className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 tabular-nums"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleAddChild}
                      disabled={!childForm.label}
                      className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#080c14] font-medium tracking-wide rounded-lg disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    >
                      Materialize Node
                    </button>
                  </div>
                )}

                {/* Flow 2: Link Existing Node Form */}
                {showLinkForm && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-mono tracking-widest uppercase text-blue-400 flex items-center justify-between">
                      Establish Edge
                      <button onClick={() => setShowLinkForm(false)} className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/10"><X size={14}/></button>
                    </h3>
                    
                    <div>
                      <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Target Vector</label>
                      <select 
                        value={linkForm.targetId}
                        onChange={(e) => setLinkForm({...linkForm, targetId: e.target.value})}
                        className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                      >
                        <option value="">Select a node in proximity...</option>
                        {availableNodes.map(n => (
                          <option key={n.id} value={n.id}>{n.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Edge Label</label>
                        <input 
                          type="text" 
                          value={linkForm.relation}
                          onChange={(e) => setLinkForm({...linkForm, relation: e.target.value})}
                          className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] mb-1.5 block">Gravity (1-10)</label>
                        <input 
                          type="number" 
                          min="1" max="10"
                          value={linkForm.strength}
                          onChange={(e) => setLinkForm({...linkForm, strength: e.target.value})}
                          className="w-full bg-[#131a28] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 tabular-nums"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (linkForm.targetId && onAddLink) {
                          onAddLink(node.id, linkForm.targetId, linkForm.relation, parseInt(linkForm.strength, 10));
                          setShowLinkForm(false);
                          setLinkForm({ targetId: '', relation: 'Connects to', strength: 5 });
                        }
                      }}
                      disabled={!linkForm.targetId}
                      className="w-full mt-2 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-medium tracking-wide rounded-lg disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    >
                      Engage Link
                    </button>
                  </div>
                )}

                {/* Connection Suggestions Box */}
                <div className="mt-8">
                  <h3 className="text-[10px] font-mono tracking-widest uppercase text-[#c084fc] flex items-center gap-2 mb-4">
                    <Shuffle size={12} /> Suggest Random Connections
                  </h3>
                  
                  {aiSuggestions.length === 0 ? (
                    <button 
                      onClick={handleGenerateSuggestions}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-purple-500/10 hover:bg-purple-500/20 text-[#c084fc] border border-purple-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-xl transition-all font-medium text-xs disabled:opacity-50"
                    >
                      {isGenerating ? 'Selecting...' : 'Suggest Random Connections'}
                    </button>
                  ) : (
                    <div className="space-y-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#c084fc] shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-[10px] text-[#5e7090] font-mono uppercase tracking-widest">Calculated Probabilities</span>
                         <button onClick={handleGenerateSuggestions} className="text-xs text-[#c084fc] hover:text-white transition-colors">Rescan</button>
                      </div>
                      {aiSuggestions.map(suggestion => {
                        const isConnected = connectedNodeIds.has(suggestion.id);
                        return (
                          <div key={suggestion.id} className="flex items-center justify-between p-2.5 bg-[#131a28]/60 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                            <span className="text-[0.8rem] text-gray-200 truncate pr-2 flex items-center gap-2.5" title={suggestion.label}>
                              <TypeDot type={suggestion.type} />
                              {suggestion.label}
                            </span>
                            {isConnected ? (
                              <button 
                                onClick={() => onRemoveLink && onRemoveLink(node.id, suggestion.id)}
                                className="text-[10px] uppercase font-mono tracking-wider px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 transition-colors"
                              >
                                Sever
                              </button>
                            ) : (
                              <button 
                                onClick={() => onAddLink && onAddLink(node.id, suggestion.id, 'Calculated Edge', 5)}
                                className="text-[10px] uppercase font-mono tracking-wider px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 transition-colors"
                              >
                                Fuse
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
