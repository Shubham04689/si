import React, { useState, useCallback, useEffect } from 'react';
import DataLoader from './components/DataLoader';
import GraphEngine from './components/GraphEngine';
import IntelligencePanel from './components/IntelligencePanel';
import { filterGraph } from './utils/graphFilter';
import { Share2, Maximize2, Download, Edit3 } from 'lucide-react';

export default function App() {
  const [globalGraph, setGlobalGraph] = useState(null);
  const [viewGraph, setViewGraph] = useState({ nodes: [], links: [] });
  
  // State for Navigation / Interactions
  const [centerId, setCenterId] = useState(null);
  const [previousCenterId, setPreviousCenterId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

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

  return (
    <div className="w-screen h-screen bg-background relative overflow-hidden font-sans text-white">
      {!globalGraph ? (
        <DataLoader onDataLoaded={handleDataLoaded} />
      ) : (
        <>
          <GraphEngine 
            viewGraph={viewGraph} 
            centerId={centerId} 
            onNodeClick={handleNodeClick} 
          />
          
          {/* Header UI overlay */}
          <header className="absolute top-0 left-0 w-full p-6 pointer-events-none z-10 flex justify-between items-start">
              <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white/90 drop-shadow-md">
                      {globalGraph.meta?.title || 'Transformation Map'}
                  </h1>
                  <p className="text-sm font-medium text-gray-300 mt-1 uppercase tracking-widest">
                      Interactive Explorer
                  </p>
              </div>
              <div className="flex gap-4 pointer-events-auto items-center">
                 <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full transition-all shadow-lg ${
                      isEditMode 
                        ? 'bg-amber-500 text-gray-900 shadow-amber-500/20' 
                        : 'bg-gray-900/50 backdrop-blur border border-gray-700 text-gray-300 hover:bg-gray-800'
                    }`}
                 >
                   <Edit3 size={16} />
                   {isEditMode ? 'Builder Mode: ON' : 'Edit Mode'}
                 </button>

                 <button
                    onClick={handleExportMap}
                    className="p-2.5 bg-gray-900/50 backdrop-blur border border-gray-700 rounded-full hover:bg-gray-800 transition shadow-lg text-gray-300"
                    title="Export Map JSON"
                 >
                   <Download size={18} />
                 </button>

                 <button className="p-2.5 bg-gray-900/50 backdrop-blur border border-gray-700 rounded-full hover:bg-gray-800 transition shadow-lg text-gray-300">
                    <Share2 size={18} />
                 </button>
                 <button className="p-2.5 bg-gray-900/50 backdrop-blur border border-gray-700 rounded-full hover:bg-gray-800 transition shadow-lg text-gray-300" onClick={() => {
                     setGlobalGraph(null);
                     setIsPanelOpen(false);
                 }}>
                    <Maximize2 size={18} className="text-gray-300" />
                 </button>
              </div>
          </header>

          <IntelligencePanel 
            node={selectedNode} 
            isOpen={isPanelOpen} 
            onClose={() => setIsPanelOpen(false)} 
            isEditMode={isEditMode}
            onUpdateNode={handleUpdateNode}
            onAddChildNode={handleAddChildNode}
          />
        </>
      )}
    </div>
  );
}
