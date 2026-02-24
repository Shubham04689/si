import React, { useState, useCallback, useEffect, useMemo } from 'react';
import DataLoader from './components/DataLoader';
import GraphEngine from './components/GraphEngine';
import IntelligencePanel from './components/IntelligencePanel';
import AiCommandCenter from './components/AiCommandCenter';
import { filterGraph } from './utils/graphFilter';
import { Share2, Maximize2, Download, Edit3, Sparkles, PanelRight, FileText } from 'lucide-react';
import Tooltip from './components/Tooltip';
import ContextMenu from './components/ContextMenu';
import AddNodeDialog from './components/AddNodeDialog';
import { generateCompletion } from './utils/aiEngine';
import { generatePDFReport } from './utils/exportUtils';

export default function App() {
  const [globalGraph, setGlobalGraph] = useState(null);
  const [viewGraph, setViewGraph] = useState({ nodes: [], links: [] });
  
  // State for Navigation / Interactions
  const [centerId, setCenterId] = useState(null);
  const [previousCenterId, setPreviousCenterId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAiCommandCenterOpen, setIsAiCommandCenterOpen] = useState(false);
  const [contextMenuState, setContextMenuState] = useState({ isOpen: false, x: 0, y: 0, node: null });
  const [addNodeDialog, setAddNodeDialog] = useState({ isOpen: false, x: 0, y: 0, parentNode: null, isGenerating: false });

  const handleDataLoaded = useCallback((json, initialCenterId) => {
    setGlobalGraph(json);
    setCenterId(initialCenterId);
    setPreviousCenterId(null);
    setSelectedNode(json.nodes.find(n => n.id === initialCenterId));
    setIsPanelOpen(true);
  }, []);

  // Update viewGraph whenever centerId or globalGraph changes
  useEffect(() => {
    if (globalGraph && centerId) {
       const filtered = filterGraph(globalGraph, centerId, previousCenterId);
       setViewGraph(filtered);
    }
  }, [globalGraph, centerId, previousCenterId]);

  const handleNodeClick = useCallback((node) => {
    if (!node) return;

    if (node.id === centerId) {
        // Interaction A: Clicking the Center Node
        // Open/Update side panel, do NOT change layout
        setSelectedNode(node);
        setIsPanelOpen(true);
    } else {
        // Interaction B: Clicking an Outer Node (The Pivot)
        setIsPanelOpen(false); // smoothly hide it briefly or just update it
        
        // Timeout to allow panel to slide slightly before changing data for smoother feel
        setTimeout(() => {
            setPreviousCenterId(centerId);
            setCenterId(node.id);
            
            // Find the original full node data for the panel
            const fullNode = globalGraph.nodes.find(n => n.id === node.id);
            setSelectedNode(fullNode);
            setIsPanelOpen(true);
        }, 150);
    }
  }, [centerId, globalGraph]);

  const handleNodeRightClick = useCallback((node, event) => {
    if (!node || !event) return;
    setContextMenuState({ isOpen: true, x: event.clientX, y: event.clientY, node });
  }, []);

  const handleContextMenuAction = useCallback((actionId, node) => {
    switch (actionId) {
       case 'edit':
         setSelectedNode(node);
         setCenterId(node.id);
         setIsEditMode(true);
         setIsPanelOpen(true);
         break;
       case 'add_child':
       case 'link_existing':
         setSelectedNode(node);
         setCenterId(node.id);
         setIsEditMode(true);
         setIsPanelOpen(true);
         break;
       case 'delete':
         setGlobalGraph(prev => {
           const newNodes = prev.nodes.filter(n => n.id !== node.id);
           const newLinks = prev.links.filter(l => 
              (typeof l.source === 'object' ? l.source.id : l.source) !== node.id && 
              (typeof l.target === 'object' ? l.target.id : l.target) !== node.id
           );
           return { ...prev, nodes: newNodes, links: newLinks };
         });
         if (centerId === node.id || selectedNode?.id === node.id) {
           setIsPanelOpen(false);
         }
         break;
    }
  }, [centerId, selectedNode]);

  // --- Builder Mode Handlers ---
  const handleUpdateNode = useCallback((updatedNode) => {
    setGlobalGraph(prev => {
      const newNodes = prev.nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
      return { ...prev, nodes: newNodes };
    });
    setSelectedNode(updatedNode); // Update side panel
  }, []);

  const handleAddChildNode = useCallback((newNode, linkRelation, linkStrength) => {
    setGlobalGraph(prev => {
      const newNodes = [...prev.nodes, newNode];
      const newLink = {
        source: centerId,
        target: newNode.id,
        relation: linkRelation,
        strength: linkStrength
      };
      const newLinks = [...prev.links, newLink];
      return { meta: prev.meta, nodes: newNodes, links: newLinks };
    });
  }, [centerId]);

  const handleAddLink = useCallback((sourceId, targetId, relation, strength) => {
    setGlobalGraph(prev => {
      // Check if link already exists to prevent duplicates
      const linkExists = prev.links.some(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === sourceId && t === targetId) || (s === targetId && t === sourceId);
      });
      if (linkExists) return prev;

      const newLink = {
        source: sourceId,
        target: targetId,
        relation: relation,
        strength: strength
      };
      
      return { ...prev, links: [...prev.links, newLink] };
    });
  }, []);

  const handleRemoveLink = useCallback((sourceId, targetId) => {
    setGlobalGraph(prev => {
      const newLinks = prev.links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return !((s === sourceId && t === targetId) || (s === targetId && t === sourceId));
      });
      return { ...prev, links: newLinks };
    });
  }, []);

  const handleRemoveNodeQuick = useCallback((node) => {
       setGlobalGraph(prev => {
         const newNodes = prev.nodes.filter(n => n.id !== node.id);
         const newLinks = prev.links.filter(l => 
            (typeof l.source === 'object' ? l.source.id : l.source) !== node.id && 
            (typeof l.target === 'object' ? l.target.id : l.target) !== node.id
         );
         return { ...prev, nodes: newNodes, links: newLinks };
       });
       if (centerId === node.id || selectedNode?.id === node.id) {
         setIsPanelOpen(false);
       }
  }, [centerId, selectedNode]);

  const handleAddNodeQuick = useCallback((parentNode, event) => {
      setAddNodeDialog({
          isOpen: true,
          x: event.clientX,
          y: event.clientY,
          parentNode: parentNode,
          isGenerating: false
      });
  }, []);

  const submitNewNode = useCallback((parentNode, label) => {
      if(!label || !label.trim()) return;
      
      const newNodeId = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
      let newType = 'peripheral_topic';
      let group = 3;
      let size = 15;

      if (parentNode.type === 'macro' || parentNode.type === 'central_hub') {
        newType = 'trend';
        group = 2;
        size = 25;
      } else if (parentNode.type === 'trend' || parentNode.type === 'key_driver' || parentNode.type === 'lifecycle' || parentNode.type === 'concept') {
        newType = 'issue';
        group = 3;
        size = 15;
      }

      const newNode = {
        id: newNodeId,
        label: label.trim(),
        type: newType,
        group: group,
        size: size,
        content: { summary: '', key_insight: '' }
      };

      setGlobalGraph(prev => {
        const newNodes = [...prev.nodes, newNode];
        const newLink = {
          source: parentNode.id,
          target: newNode.id,
          relation: 'Connects to',
          strength: 5
        };
        const newLinks = [...prev.links, newLink];
        return { ...prev, nodes: newNodes, links: newLinks };
      });
      
      setAddNodeDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleAIGenerateBranch = async (parentNode) => {
      setAddNodeDialog(prev => ({ ...prev, isGenerating: true }));

      // Find existing children to avoid duplicates
      const existingChildren = globalGraph.links
          .filter(l => (typeof l.source === 'object' ? l.source.id : l.source) === parentNode.id)
          .map(l => {
              const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
              const node = globalGraph.nodes.find(n => n.id === tgtId);
              return node ? node.label : '';
          })
          .filter(Boolean);

      const systemPrompt = `You are an AI generating a single exact topic name to expand a brainstorm graph.
The user is expanding the node: "${parentNode.label}".
Existing children to avoid duplicating: ${existingChildren.join(', ') || 'None'}.
Return ONLY a short, punchy 1-4 word label for a NEW logical sub-topic or branch. Do not use quotes, punctuation, or prefacing text. Just the label.`;

      try {
          const rawResponse = await generateCompletion(systemPrompt, `Generate the next logical sub-branch for "${parentNode.label}".`);
          const label = rawResponse.replace(/["']/g, '').trim();
          if (label) {
             submitNewNode(parentNode, label);
          } else {
             throw new Error("Empty response");
          }
      } catch (err) {
          console.error("AI Node Generation Failed:", err);
          alert("AI Generation failed. Ensure AI Provider is running and API Key is correct.");
          setAddNodeDialog(prev => ({ ...prev, isGenerating: false }));
      }
  };

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode || !globalGraph) return new Set();
    const set = new Set();
    globalGraph.links.forEach(l => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (s === selectedNode.id) set.add(t);
      if (t === selectedNode.id) set.add(s);
    });
    return set;
  }, [selectedNode, globalGraph]);

  const handleExportMap = () => {
    if (!globalGraph) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(globalGraph, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "custom_map.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleExportPDF = () => {
    if (!globalGraph) return;
    try {
       generatePDFReport(globalGraph);
    } catch (err) {
       console.error("PDF Export failed:", err);
       alert("Failed to generate PDF. Make sure the graph data is valid.");
    }
  };

  return (
    <div className="w-screen h-screen bg-background relative overflow-hidden font-sans text-white">
      {!globalGraph ? (
        <DataLoader onDataLoaded={handleDataLoaded} />
      ) : (
        <>
          <GraphEngine 
            viewGraph={viewGraph} 
            centerId={centerId} 
            isEditMode={isEditMode}
            onNodeClick={handleNodeClick} 
            onNodeRightClick={handleNodeRightClick}
            onAddNodeClick={handleAddNodeQuick}
            onRemoveNodeClick={handleRemoveNodeQuick}
          />
          
          <ContextMenu 
            isOpen={contextMenuState.isOpen}
            x={contextMenuState.x}
            y={contextMenuState.y}
            node={contextMenuState.node}
            onClose={() => setContextMenuState(prev => ({...prev, isOpen: false}))}
            onAction={handleContextMenuAction}
          />

          <AddNodeDialog
            isOpen={addNodeDialog.isOpen}
            x={addNodeDialog.x}
            y={addNodeDialog.y}
            parentNode={addNodeDialog.parentNode}
            isGenerating={addNodeDialog.isGenerating}
            onClose={() => setAddNodeDialog(prev => ({ ...prev, isOpen: false }))}
            onSubmit={submitNewNode}
            onAIGenerate={handleAIGenerateBranch}
          />

          {/* Header UI overlay - Frosted glass upgrade */}
          <header className="fixed top-0 left-0 right-0 h-14 bg-[rgba(10,10,20,0.9)] backdrop-blur-[20px] backdrop-saturate-150 border-b border-[rgba(255,255,255,0.08)] z-[100] flex justify-between items-center px-3 md:px-5">
            {/* Left: Wordmark & Title */}
            <div className="flex items-center overflow-hidden">
              {/* Monogram */}
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg border border-[#c9a84c]/40 bg-[#c9a84c]/5 flex items-center justify-center font-display text-[#d4af37] text-[0.7rem] md:text-[0.8rem] leading-none pt-0.5 shadow-[0_0_8px_rgba(201,168,76,0.15)] flex-shrink-0">
                SI
              </div>
              
              {/* Text Wordmark - Hidden on small screens */}
              <div className="ml-2 md:ml-3 hidden sm:flex items-baseline tracking-wide">
                <span className="font-sans font-light text-white text-[0.85rem] md:text-[0.95rem]">Strategic</span>
                <span className="font-display italic font-light text-white text-[0.95rem] md:text-[1.05rem] ml-1 md:ml-1.5">Intelligence</span>
              </div>
              
              <span className="font-mono text-[0.5rem] md:text-[0.56rem] px-1.5 md:px-2 py-[2px] border border-white/10 rounded-full text-[#5e7090] ml-2 md:ml-3 tracking-widest uppercase flex-shrink-0">v2.0</span>
              
              {/* Separator - Hidden on mobile */}
              <div className="w-px h-4 bg-white/10 mx-2 md:mx-4 hidden md:block"></div>
              
              {/* Editable Map Title - Hidden on mobile */}
              <div 
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={(e) => {
                  if (!globalGraph) return;
                  setGlobalGraph(prev => ({
                    ...prev, 
                    meta: { ...prev.meta, title: e.target.textContent }
                  }));
                }}
                className="font-mono text-[0.6rem] md:text-[0.65rem] text-[#9ca3af] border-b border-dashed border-white/10 px-1 py-[2px] outline-none min-w-[80px] md:min-w-[100px] transition-colors focus:border-white/30 hover:text-white hidden md:block truncate max-w-[150px]"
              >
                {globalGraph.meta?.title || 'Strategic Vision'}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center h-full gap-1.5 md:gap-3">
              {/* Action Group 1 - Responsive */}
              <div className="flex items-center gap-1 md:gap-2">
                <Tooltip content="Automated Architecture" shortcut="K" position="bottom" delay={200}>
                  <button
                    onClick={() => setIsAiCommandCenterOpen(true)}
                    disabled={isAiCommandCenterOpen}
                    className="group flex items-center gap-1 md:gap-1.5 text-[0.55rem] md:text-[0.65rem] uppercase tracking-widest font-mono px-2 md:px-3 py-1.5 rounded-lg border border-[#a855f7]/50 text-[#c084fc] bg-[#a855f7]/10 hover:bg-[#a855f7]/20 transition-all shadow-[0_0_12px_rgba(168,85,247,0.15)] active:scale-95 disabled:opacity-45 disabled:pointer-events-none relative overflow-hidden"
                  >
                    <Sparkles size={12} md:size={13} className="text-[#a855f7]" />
                    <span className="hidden sm:inline">AI Command Center</span>
                    <span className="sm:hidden">AI</span>
                  </button>
                </Tooltip>

                <Tooltip content="Edit Network State" shortcut="E" position="bottom" delay={200}>
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-1 md:gap-1.5 text-[0.55rem] md:text-[0.65rem] uppercase tracking-widest font-mono px-2 md:px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${
                      isEditMode 
                        ? 'border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                        : 'border-white/10 text-gray-300 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10'
                    }`}
                  >
                    {isEditMode && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"></span>}
                    <Edit3 size={12} md:size={13} />
                    <span className="hidden sm:inline">{isEditMode ? 'EDITING' : 'Builder Mode'}</span>
                    <span className="sm:hidden">{isEditMode ? 'EDIT' : 'BUILD'}</span>
                  </button>
                </Tooltip>
              </div>

              {/* Separator - Hidden on mobile */}
              <div className="w-px h-4 bg-white/10 mx-1 hidden md:block"></div>

              {/* Right: Actions */}
            <div className="flex items-center gap-1 md:gap-2">
                 <Tooltip content={isPanelOpen ? "Hide Intelligence Panel" : "Show Intelligence Panel"} position="bottom" delay={300}>
                   <button
                     onClick={() => setIsPanelOpen(!isPanelOpen)}
                     disabled={!selectedNode}
                     className={`p-1.5 border rounded-lg transition-all active:scale-95 ${
                        isPanelOpen 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30" 
                        : "bg-[#131a28]/80 text-gray-400 border-white/10 hover:text-white"
                     } ${!selectedNode ? "opacity-50 cursor-not-allowed" : ""}`}
                   >
                     <PanelRight size={13} className="md:w-[14px] md:h-[14px]" />
                   </button>
                 </Tooltip>
                 
                 <div className="w-px h-4 bg-white/10 mx-0.5 md:mx-1 hidden sm:block"></div>

                 <Tooltip content="Share Environment" shortcut="S" position="bottom" delay={300}>
                   <button className="p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all active:scale-95 hidden sm:flex">
                     <Share2 size={13} className="md:w-[14px] md:h-[14px]" />
                   </button>
                 </Tooltip>
                 <Tooltip content="Export PDF Report" shortcut="P" position="bottom" delay={300}>
                   <button
                      onClick={handleExportPDF}
                      className="p-1.5 border border-[#c084fc]/30 rounded-lg text-[#c084fc] hover:text-[#d8b4fe] hover:border-[#c084fc]/60 hover:bg-[#c084fc]/10 transition-all active:scale-95"
                   >
                     <FileText size={13} className="md:w-[14px] md:h-[14px]" />
                   </button>
                 </Tooltip>
                 <Tooltip content="Export JSON Graph" shortcut="X" position="bottom" delay={300}>
                   <button
                      onClick={handleExportMap}
                      className="p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all active:scale-95"
                   >
                     <Download size={13} className="md:w-[14px] md:h-[14px]" />
                   </button>
                 </Tooltip>
                 <Tooltip content="Scrub Canvas" shortcut="C" position="bottom" delay={300}>
                   <button 
                      className="p-1.5 border border-white/10 rounded-lg text-gray-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all ml-0.5 md:ml-1 active:scale-95" 
                      onClick={() => {
                        if(window.confirm('Clear all data from map?')) {
                          setGlobalGraph(null);
                          setIsPanelOpen(false);
                        }
                      }}>
                     <Maximize2 size={13} className="md:w-[14px] md:h-[14px] rotate-45" />
                   </button>
                 </Tooltip>
              </div>
            </div>
          </header>

          <IntelligencePanel 
            node={selectedNode} 
            isOpen={isPanelOpen} 
            onClose={() => setIsPanelOpen(false)} 
            isEditMode={isEditMode}
            onUpdateNode={handleUpdateNode}
            onAddChildNode={handleAddChildNode}
            onAddLink={handleAddLink}
            onRemoveLink={handleRemoveLink}
            onNavigateToNode={handleNodeClick}
            allNodes={globalGraph.nodes}
            connectedNodeIds={connectedNodeIds}
          />
          
          <AiCommandCenter 
            isOpen={isAiCommandCenterOpen}
            onClose={() => setIsAiCommandCenterOpen(false)}
            onMapGenerated={(newGraph, centerId) => {
               setIsAiCommandCenterOpen(false);
               handleDataLoaded(newGraph, centerId);
            }}
          />

          {/* Footer / Status Bar */}
          <footer className="fixed bottom-0 left-0 right-0 h-7 bg-[#080c14]/80 backdrop-blur-[20px] border-t border-white/5 z-40 flex items-center justify-between px-2 md:px-4 font-mono text-[8px] md:text-[9px] text-[#5e7090] tracking-widest uppercase select-none">
            <div className="flex items-center gap-2 md:gap-4">
              <span className="flex items-center gap-1 md:gap-1.5">
                <span className={isEditMode ? "w-1.5 h-1.5 rounded-full bg-[#f59e0b] shadow-[0_0_5px_rgba(245,158,11,0.6)]" : "w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"}></span>
                <span className="hidden sm:inline">{isEditMode ? 'Edit Mode Active' : 'Navigation Mode'}</span>
                <span className="sm:hidden">{isEditMode ? 'EDIT' : 'NAV'}</span>
              </span>
              <div className="w-px h-3 bg-white/10 hidden sm:block"></div>
              <span className="hidden sm:inline">Nodes: <span className="text-gray-300 font-medium tabular-nums">{globalGraph.nodes.length}</span></span>
              <span className="hidden sm:inline">Edges: <span className="text-gray-300 font-medium tabular-nums">{globalGraph.links.length}</span></span>
              <span className="sm:hidden text-gray-300 font-medium tabular-nums">{globalGraph.nodes.length}N/{globalGraph.links.length}E</span>
            </div>
                        {/* Navigation Pill Buttons - Hidden on mobile */}
              <div className="hidden md:flex bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] p-1 rounded-full backdrop-blur-md shadow-sm">
                 <button className="px-5 py-1.5 text-[0.7rem] uppercase tracking-wider font-semibold rounded-full bg-white/10 text-white shadow-sm transition-all">Home</button>
                 <button className="px-5 py-1.5 text-[0.7rem] uppercase tracking-wider font-semibold rounded-full text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.12)] transition-all">History</button>
                 <button className="px-5 py-1.5 text-[0.7rem] uppercase tracking-wider font-semibold rounded-full text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.12)] transition-all flex items-center gap-2">Monitor <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span></button>
              </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <span className="hidden md:flex items-center gap-1.5 text-emerald-500/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Local DB Connected
              </span>
              <span className="md:hidden flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-500/80">DB</span>
              </span>
              <div className="w-px h-3 bg-white/10 hidden sm:block"></div>
              <span className="text-gray-500 hidden lg:inline">Universal Graph Engine</span>
              <span className="text-gray-500 lg:hidden hidden sm:inline">UGE</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
