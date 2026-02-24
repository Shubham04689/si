import React, { useRef, useState } from 'react';
import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';

const validateMapData = (data) => {
  if (!data || typeof data !== 'object') throw new Error('Data must be a JSON object.');
  if (!Array.isArray(data.nodes) || data.nodes.length === 0) throw new Error('Map must have a "nodes" array with at least one entry.');
  if (!Array.isArray(data.links)) throw new Error('Map must have a "links" array (can be empty).');
  const nodeIds = new Set(data.nodes.map(n => n.id));
  data.links.forEach((l, i) => {
    const src = typeof l.source === 'object' ? l.source.id : l.source;
    const tgt = typeof l.target === 'object' ? l.target.id : l.target;
    if (!nodeIds.has(src)) throw new Error(`Link ${i}: source "${src}" does not match any node ID.`);
    if (!nodeIds.has(tgt)) throw new Error(`Link ${i}: target "${tgt}" does not match any node ID.`);
  });
};

export default function DataLoader({ onDataLoaded }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        validateMapData(json);
        
        // Find center node: the one with the most connections
        const connectionCounts = {};
        json.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
            connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
        });

        let initialCenterId = json.nodes.find(n => n.type === 'macro' || n.type === 'central_hub')?.id;

        if (!initialCenterId) {
          let maxConnections = -1;
          Object.entries(connectionCounts).forEach(([nodeId, count]) => {
             if (count > maxConnections) {
               maxConnections = count;
               initialCenterId = nodeId;
             }
          });
        }
        
        if (!initialCenterId) initialCenterId = json.nodes[0]?.id;

        onDataLoaded(json, initialCenterId);
      } catch (err) {
        setError(`Failed to process map data: ${err.message}`);
      } finally {
        setLoading(false);
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleCreateBlankMap = () => {
    const blankMapData = {
      meta: {
        title: "New Strategic Map",
        version: "2.0"
      },
      nodes: [
        {
          id: "central_hub",
          label: "Core Topic",
          type: "macro",
          content: {
            summary: "This is a new strategic map. Define your core topic here.",
            key_insight: "Everything starts from the center.",
            sub_topics: [],
            metrics: [],
            challenges: [],
            expert_quotes: [],
            related_reports: []
          }
        }
      ],
      links: []
    };
    onDataLoaded(blankMapData, "central_hub");
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#080c14] text-white p-6 z-50 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
         <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] mix-blend-screen opacity-50"></div>
         <div className="absolute inset-0 bg-[#080c14]/40 backdrop-blur-[100px]"></div>
      </div>

      <div className="relative max-w-md w-full bg-white/[0.02] backdrop-blur-[40px] rounded-3xl border border-white/5 p-10 shadow-[0_24px_80px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <UploadCloud size={32} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-display font-light mb-3 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Strategic Intelligence</h1>
          <p className="text-[#5e7090] text-[0.85rem] font-sans tracking-wide leading-relaxed">Upload your JSON transformation map schema to begin exploring data.</p>
        </div>

        <div 
          onClick={() => !loading && fileInputRef.current?.click()}
          className="relative border border-dashed border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02] transition-all duration-300 rounded-2xl p-10 text-center cursor-pointer group overflow-hidden"
        >
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json,application/json" 
            className="hidden" 
          />
          <FileJson className="mx-auto text-[#5e7090] group-hover:text-blue-400 mb-5 transition-colors duration-300 relative z-10" size={36} />
          <p className="text-gray-300 font-medium tracking-wide relative z-10 group-hover:text-white transition-colors">Select JSON Manifest</p>
          <p className="text-[#5e7090] text-[10px] font-mono uppercase tracking-widest mt-3 relative z-10">Strict Schema Required</p>
        </div>

        <div className="flex items-center gap-4 my-8">
            <div className="h-px bg-white/5 flex-1"></div>
            <span className="text-[10px] text-[#5e7090] font-mono uppercase tracking-widest bg-[#080c14] px-2 rounded">OR</span>
            <div className="h-px bg-white/5 flex-1"></div>
        </div>

        <button 
          onClick={handleCreateBlankMap}
          className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl p-4 font-medium transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-[0.98]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Initialize Blank Topology
        </button>

        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-[0.85rem] animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="shrink-0 mt-0.5" size={16} />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}
        
        {loading && (
            <div className="mt-8 flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* Blurred core */}
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-md animate-pulse"></div>
                    <div className="absolute inset-2 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full opacity-80"></div>
                    
                    {/* Orbiting arc ring */}
                    <svg className="absolute -inset-2 w-20 h-20 animate-[spin_2s_linear_infinite]" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                        <circle 
                           cx="50" cy="50" r="46" fill="none" 
                           stroke="url(#loading-gradient)" 
                           strokeWidth="2"
                           strokeDasharray="100 200"
                           strokeLinecap="round"
                        />
                        <defs>
                           <linearGradient id="loading-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4A90D9" />
                              <stop offset="100%" stopColor="#9B59B6" />
                           </linearGradient>
                        </defs>
                    </svg>
                </div>
                
                <div className="text-[#5e7090] font-sans text-sm tracking-wide animate-pulse flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Exploring Strategic Topology...
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
