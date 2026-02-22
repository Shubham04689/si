import React, { useState, useEffect } from 'react';
import { X, FileText, ExternalLink, BarChart2, AlertTriangle, MessageSquare, Layers, Plus, Save, Edit2, Link as LinkIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IntelligencePanel({ node, isOpen, onClose, isEditMode, onUpdateNode, onAddChildNode, onAddLink, onRemoveLink, allNodes = [], connectedNodeIds = new Set() }) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [childForm, setChildForm] = useState({ label: '', summary: '', relation: 'Connects to', strength: 5 });
  const [showChildForm, setShowChildForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ targetId: '', relation: 'Connects to', strength: 5 });
  
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableNodes = allNodes.filter(n => n.id !== node?.id && !connectedNodeIds.has(n.id));

  useEffect(() => {
    if (node) {
      setEditForm({
        label: node.label || '',
        summary: node.content?.summary || '',
        key_insight: node.content?.key_insight || '',
      });
      setIsEditingContent(false);
      setShowChildForm(false);
      setShowLinkForm(false);
      setAiSuggestions([]);
    }
  }, [node]);

  const handleGenerateSuggestions = () => {
    setIsGenerating(true);
    // Simple mock AI: wait 1s, then find random unconnected nodes
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
        key_insight: editForm.key_insight
      }
    };
    onUpdateNode(updatedNode);
    setIsEditingContent(false);
  };

  const handleAddChild = () => {
    if (!node || !onAddChildNode || !childForm.label) return;
    
    // Determine type based on current node
    let newType = 'peripheral_topic'; // Satellite default
    let group = 3;
    let size = 15;

    if (node.type === 'macro' || node.type === 'central_hub') {
      newType = 'trend'; // Planet
      group = 2;
      size = 25;
    } else if (node.type === 'trend' || node.type === 'key_driver' || node.type === 'lifecycle' || node.type === 'concept') {
      newType = 'issue'; // Satellite
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

  return (
    <div className={cn(
        "fixed top-0 right-0 h-full w-[450px] bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl p-6 transition-transform duration-500 ease-in-out z-40 overflow-y-auto overflow-x-hidden flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {node && (
        <>
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-2 block">
                {node.type === 'macro' ? 'Macro Trend' : node.type === 'trend' ? 'Key Trend' : 'Strategic Issue'}
              </span>
              {isEditMode && isEditingContent ? (
                  <input 
                    type="text" 
                    value={editForm.label}
                    onChange={(e) => setEditForm({...editForm, label: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-2xl font-light text-white mb-2"
                  />
              ) : (
                  <h2 className="text-3xl font-light text-white leading-tight pr-4">{node.label}</h2>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isEditMode && (
                <button 
                  onClick={() => isEditingContent ? handleSaveEdit() : setIsEditingContent(true)}
                  className={`p-2 rounded-lg transition-colors ${
                    isEditingContent ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-amber-400 hover:bg-gray-800'
                  }`}
                  title={isEditingContent ? "Save Changes" : "Edit Details"}
                >
                  {isEditingContent ? <Save size={18} /> : <Edit2 size={18} />}
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-8 pb-12">
            
            {/* 1. Executive Summary */}
            {node.content?.summary && (
              <section>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" /> Executive Summary
                </h3>
                {isEditMode && isEditingContent ? (
                    <textarea 
                      value={editForm.summary}
                      onChange={(e) => setEditForm({...editForm, summary: e.target.value})}
                      className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 resize-none"
                    />
                ) : (
                    <div className="text-gray-400 text-sm leading-relaxed">
                        {node.content.summary}
                    </div>
                )}
              </section>
            )}

            {/* 2. Key Insight (Highlighted block) */}
            {node.content?.key_insight && (
              <section className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="text-xs font-semibold text-blue-400 uppercase mb-2">Key Insight</h3>
                {isEditMode && isEditingContent ? (
                    <textarea 
                      value={editForm.key_insight}
                      onChange={(e) => setEditForm({...editForm, key_insight: e.target.value})}
                      className="w-full h-24 bg-gray-800/50 border border-gray-700 rounded p-2 text-[15px] italic text-blue-200 resize-none"
                    />
                ) : (
                    <p className="text-blue-100/90 text-[15px] italic leading-snug">
                      "{node.content.key_insight}"
                    </p>
                )}
              </section>
            )}

            {/* 3. Key Metrics (Grid Layout) */}
            {node.content?.metrics && node.content.metrics.length > 0 && (
               <section>
                 <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                   <BarChart2 size={16} className="text-emerald-400" /> Key Data Points
                 </h3>
                 <div className="grid grid-cols-2 gap-3">
                    {node.content.metrics.map((metric, idx) => (
                       <div key={idx} className="bg-gray-800/40 border border-gray-700/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
                          <p className="text-lg font-semibold text-emerald-400">{metric.value}</p>
                       </div>
                    ))}
                 </div>
               </section>
            )}
            
            {/* 4. Sub-Topics (Pills/Badges) */}
            {node.content?.sub_topics && node.content.sub_topics.length > 0 && (
               <section>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <Layers size={16} className="text-purple-400" /> Related Concepts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                     {node.content.sub_topics.map((topic, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full text-xs font-medium">
                           {topic}
                        </span>
                     ))}
                  </div>
               </section>
            )}

            {/* 5. Challenges (List format) */}
            {node.content?.challenges && node.content.challenges.length > 0 && (
               <section>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" /> Structural Challenges
                  </h3>
                  <ul className="space-y-2">
                     {node.content.challenges.map((challenge, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                           <span className="text-amber-500/50 mt-0.5">•</span>
                           {challenge}
                        </li>
                     ))}
                  </ul>
               </section>
            )}
            
            {/* 6. Expert Quotes */}
            {node.content?.expert_quotes && node.content.expert_quotes.length > 0 && (
               <section>
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <MessageSquare size={16} className="text-pink-400" /> Expert Perspectives
                  </h3>
                  <div className="space-y-3">
                     {node.content.expert_quotes.map((quoteObj, idx) => (
                        <blockquote key={idx} className="border-l-2 border-gray-700 pl-4 py-1">
                           <p className="text-sm text-gray-400 italic mb-2">"{quoteObj.quote}"</p>
                           <footer className="text-xs text-gray-500">— {quoteObj.author}</footer>
                        </blockquote>
                     ))}
                  </div>
               </section>
            )}

            {/* 7. Related Reports */}
            {node.content?.related_reports && node.content.related_reports.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-gray-300 mb-3 border-b border-gray-800 pb-2">
                  Deep Dive Reports
                </h3>
                <ul className="space-y-3">
                  {node.content.related_reports.map((report, idx) => (
                    <li key={idx}>
                      <a 
                        href={report.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group flex flex-col p-3 rounded-lg hover:bg-gray-800/50 border border-transparent hover:border-gray-700 transition-all"
                      >
                        <span className="text-sm text-gray-300 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                          {report.title}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            
            {/* Builder Mode: Add Child Node or Link */}
            {isEditMode && (
              <section className="mt-8 pt-6 border-t border-gray-800 space-y-3">
                
                {/* Action Choice Buttons */}
                {!showChildForm && !showLinkForm && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowChildForm(true)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl transition-colors font-medium text-xs text-center"
                    >
                      <Plus size={18} /> 
                      {node.type === 'macro' || node.type === 'central_hub' ? 'Add Planet' : 'Add Satellite'}
                    </button>
                    <button 
                      onClick={() => setShowLinkForm(true)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl transition-colors font-medium text-xs text-center"
                    >
                      <LinkIcon size={18} /> 
                      Link Existing
                    </button>
                  </div>
                )}

                {/* Flow 1: Add New Node Form */}
                {showChildForm && (
                  <div className="bg-gray-800/50 border border-amber-500/30 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-amber-400 flex items-center justify-between">
                      New Connected Node
                      <button onClick={() => setShowChildForm(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                    </h3>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Topic Name</label>
                      <input 
                        type="text" 
                        value={childForm.label}
                        onChange={(e) => setChildForm({...childForm, label: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        placeholder="e.g. Natural Language Processing"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Brief Summary</label>
                      <textarea 
                        value={childForm.summary}
                        onChange={(e) => setChildForm({...childForm, summary: e.target.value})}
                        className="w-full h-20 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                        placeholder="Short description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Relation Label</label>
                        <input 
                          type="text" 
                          value={childForm.relation}
                          onChange={(e) => setChildForm({...childForm, relation: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Link Strength (1-10)</label>
                        <input 
                          type="number" 
                          min="1" max="10"
                          value={childForm.strength}
                          onChange={(e) => setChildForm({...childForm, strength: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleAddChild}
                      disabled={!childForm.label}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Create & Connect
                    </button>
                  </div>
                )}

                {/* Flow 2: Link Existing Node Form */}
                {showLinkForm && (
                  <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-blue-400 flex items-center justify-between">
                      Link Existing Node
                      <button onClick={() => setShowLinkForm(false)} className="text-gray-400 hover:text-white"><X size={14}/></button>
                    </h3>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Target Node</label>
                      <select 
                        value={linkForm.targetId}
                        onChange={(e) => setLinkForm({...linkForm, targetId: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a node to connect...</option>
                        {availableNodes.map(n => (
                          <option key={n.id} value={n.id}>{n.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Relation Label</label>
                        <input 
                          type="text" 
                          value={linkForm.relation}
                          onChange={(e) => setLinkForm({...linkForm, relation: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Link Strength (1-10)</label>
                        <input 
                          type="number" 
                          min="1" max="10"
                          value={linkForm.strength}
                          onChange={(e) => setLinkForm({...linkForm, strength: e.target.value})}
                          className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-blue-500"
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
                      className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
                    >
                      Connect Nodes
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Builder Mode: ✨ AI Connection Suggestions Box */}
            {isEditMode && (
              <section className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-4">
                  ✨ AI Connection Suggestions
                </h3>
                
                {aiSuggestions.length === 0 ? (
                  <button 
                    onClick={handleGenerateSuggestions}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {isGenerating ? 'Analyzing Knowledge Graph...' : 'Generate AI Suggestions'}
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-gray-800/40 border border-purple-500/20 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs text-gray-400">Suggested connections based on context:</span>
                       <button onClick={handleGenerateSuggestions} className="text-xs text-purple-400 hover:text-purple-300">Regenerate</button>
                    </div>
                    {aiSuggestions.map(suggestion => {
                      const isConnected = connectedNodeIds.has(suggestion.id);
                      return (
                        <div key={suggestion.id} className="flex items-center justify-between p-2 bg-gray-900/60 rounded border border-gray-700">
                          <span className="text-sm text-gray-200 truncate pr-2 flex items-center gap-2" title={suggestion.label}>
                            {/* Color coding dots based on type */}
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                suggestion.type === 'macro' ? "bg-amber-400" :
                                (suggestion.type === 'trend' || suggestion.type === 'key_driver' || suggestion.type === 'concept') ? "bg-white" : "bg-blue-400"
                            )}></span>
                            {suggestion.label}
                          </span>
                          {isConnected ? (
                            <button 
                              onClick={() => onRemoveLink && onRemoveLink(node.id, suggestion.id)}
                              className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 whitespace-nowrap transition-colors"
                            >
                              Remove
                            </button>
                          ) : (
                            <button 
                              onClick={() => onAddLink && onAddLink(node.id, suggestion.id, 'AI Suggested Link', 5)}
                              className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/20 whitespace-nowrap transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

          </div>
          
          {/* Decorative footer element */}
          <div className="mt-auto pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
            <span>Strategic Intelligence Map</span>
            <span>v2.0.0</span>
          </div>
        </>
      )}
    </div>
  );
}
