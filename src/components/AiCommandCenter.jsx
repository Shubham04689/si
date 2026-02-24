import React, { useState, useEffect } from 'react';
import { Sparkles, X, BrainCircuit, Type, Settings, AlertTriangle, GripHorizontal, FileClock, ChevronRight } from 'lucide-react';
import { cn } from './IntelligencePanel';
import AiSettings from './AiSettings';

const PRESETS = [
  "Analyze the impact of Generative AI on the future of healthcare.",
  "Map the geopolitical risks in the semiconductor supply chain.",
  "Explore the evolution of autonomous transport over the next decade."
];

export default function AiCommandCenter({ isOpen, onClose, onMapGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentPrompts, setRecentPrompts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('recent_prompts');
      if (saved) setRecentPrompts(JSON.parse(saved));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveRecentPrompt = (text) => {
    let recent = [text, ...recentPrompts.filter(p => p !== text)].slice(0, 5);
    setRecentPrompts(recent);
    localStorage.setItem('recent_prompts', JSON.stringify(recent));
  };

  const generateLayer = async (baseUrl, model, headers, systemPrompt, userPrompt) => {
      const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
              model: model,
              messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
              stream: false
          })
      });

      if (!res.ok) {
          throw new Error(`API Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const content = data.choices[0].message.content;

      let cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const firstBrace = cleanContent.indexOf('{');
      const lastBrace = cleanContent.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
           throw new Error("Could not locate valid JSON object in response.");
      }
      
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleanContent);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setErrorMsg('');
    setIsGenerating(true);
    setGenerationStep("Initializing Universal API Connection...");
    saveRecentPrompt(prompt);

    try {
        const endpoint = localStorage.getItem('ai_endpoint') || 'http://localhost:11434/v1';
        const apiKey = localStorage.getItem('ai_api_key') || '';
        const model = localStorage.getItem('ai_model') || 'llama3';

        const baseUrl = endpoint.replace(/\/$/, '');
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        // ---- PHASE 1: Generate Core & Primary Branches ----
        const phase1SystemPrompt = `You are a highly advanced Intelligence Analyst. Your task is to output a Strategic Intelligence Map strictly in JSON format based on the user's prompt. Do NOT wrap the JSON in markdown blocks. Output raw parsable JSON.
        
The JSON exactly match this schema:
{
  "meta": { "title": "A short, brilliant title (max 5 words)", "description": "A 1-sentence description." },
  "nodes": [
    { "id": "central_topic", "label": "Main Topic", "type": "macro", "group": 1, "size": 30, "content": { "summary": "Short paragraph", "key_insight": "One line" } },
    { "id": "sub_topic_1", "label": "Key Factor", "type": "trend", "group": 2, "size": 20, "content": { "summary": "..." } }
  ],
  "links": [
    { "source": "central_topic", "target": "sub_topic_1", "relation": "Drives", "strength": 8 }
  ]
}

CRITICAL RULES:
1. ALWAYS include 1 and only 1 'macro' node which acts as the center. Give it size 30.
2. Generate 3 to 5 'trend' nodes connected to the macro node. (size 20)
3. DO NOT generate peripheral nodes. We are only building the first layer.
4. Ensure 'source' and 'target' in 'links' exactly match the 'id' of nodes. Use underscore_case for IDs.
5. All 'relation' fields must be short verbs.`;

        setGenerationStep(`Phase 1: Synthesizing core topology with ${model}...`);
        
        let masterGraph = { meta: {}, nodes: [], links: [] };
        let centerId = "";
        
        const phase1Data = await generateLayer(baseUrl, model, headers, phase1SystemPrompt, prompt);
        
        if (!phase1Data.nodes || !phase1Data.links) throw new Error("Phase 1 failed to return valid graph schema.");
        
        masterGraph.meta = phase1Data.meta;
        masterGraph.nodes = [...phase1Data.nodes];
        masterGraph.links = [...phase1Data.links];
        
        centerId = masterGraph.nodes.find(n => n.type === 'macro')?.id || masterGraph.nodes[0].id;
        
        // Identify the branches we just created
        const primaryBranches = masterGraph.nodes.filter(n => n.type === 'trend');

        // ---- PHASE 2: Generate Sub-Branches for each Primary Branch ----
        
        for (let i = 0; i < primaryBranches.length; i++) {
             const branch = primaryBranches[i];
             setGenerationStep(`Phase 2: Deep-diving branch ${i+1}/${primaryBranches.length} (${branch.label})...`);
             
             // Wait to avoid rate limits (1.5 seconds)
             await delay(1500);
             
             const phase2SystemPrompt = `You are a highly advanced Intelligence Analyst. Your task is to output a strictly JSON formatted map expanding upon a specific branch of a larger topic.

The main overarching topic is: "${prompt}"
The specific branch you need to break down and expand upon is: "${branch.label}"

Return ONLY an array of new sub-topic nodes and the links connecting them back to this branch node.
The branch node ID is "${branch.id}".
Use this schema strictly, outputting raw parsable JSON:
{
  "nodes": [
    { "id": "sub_sub_topic_1", "label": "Peripheral Idea", "type": "peripheral_topic", "group": 3, "size": 15, "content": { "summary": "Short paragraph analyzing this aspect." } }
  ],
  "links": [
    { "source": "${branch.id}", "target": "sub_sub_topic_1", "relation": "Influences", "strength": 5 }
  ]
}

CRITICAL RULES:
1. Generate 2 to 4 'peripheral_topic' nodes. (size 15).
2. ALL links must have "source": "${branch.id}".
3. Use underscore_case for IDs. ENSURE THEY ARE UNIQUE across the entire graph.`;

             try {
                 const phase2Data = await generateLayer(baseUrl, model, headers, phase2SystemPrompt, `Expand on the topic: ${branch.label} in context of ${prompt}`);
                 
                 if (phase2Data.nodes && phase2Data.links) {
                     masterGraph.nodes.push(...phase2Data.nodes);
                     masterGraph.links.push(...phase2Data.links);
                 }
             } catch (branchErr) {
                 console.warn(`Failed to expand branch ${branch.label}:`, branchErr);
                 // Continue to the next branch even if one fails
             }
        }

        setGenerationStep("Finalizing topology structure...");
        
        setIsGenerating(false);
        setPrompt("");
        setGenerationStep("");
        onMapGenerated(masterGraph, centerId);

    } catch (err) {
        console.error("AI Generation Failed:", err);
        setErrorMsg(err.message || "Failed to generate map. Check your AI Settings and ensure the model is running and not rate-limited.");
        setIsGenerating(false);
        setGenerationStep("");
    }
  };

  const estimatedNodes = Math.max(5, Math.min(30, Math.floor(prompt.length / 50)));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#080c14]/80 backdrop-blur-[6px] transition-all duration-300 animate-in fade-in">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#a855f7]/10 rounded-full blur-[120px] mix-blend-screen"></div>
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#3b82f6]/10 rounded-full blur-[150px] mix-blend-screen"></div>
      </div>

      <div className={cn(
          "relative w-full max-w-[900px] bg-[#0d1420]/95 backdrop-blur-[40px] border shadow-2xl overflow-hidden transition-all duration-500 rounded-2xl flex animate-in zoom-in-[0.98] slide-in-from-bottom-4 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isGenerating ? "border-[#a855f7]/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] ring-1 ring-[#a855f7]/20" : "border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
      )}>
          
        {/* Left Column: Recent & Presets */}
        <div className="w-64 border-r border-white/5 bg-black/20 hidden md:flex flex-col p-6">
           <h3 className="text-[10px] uppercase tracking-widest font-mono text-[#5e7090] mb-4 flex items-center gap-2">
             <FileClock size={12}/> Recent Syntheses
           </h3>
           <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
             {recentPrompts.length === 0 ? (
               <p className="text-xs text-gray-600 italic">No recent prompts.</p>
             ) : (
               recentPrompts.map((p, i) => (
                 <button 
                   key={i} 
                   onClick={() => setPrompt(p)}
                   className="w-full text-left p-2.5 rounded-lg border border-transparent hover:border-white/5 hover:bg-white/[0.02] transition-colors group"
                 >
                   <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed group-hover:text-gray-300 transition-colors">{p}</p>
                 </button>
               ))
             )}
           </div>

           <div className="mt-6 pt-6 border-t border-white/5">
             <h3 className="text-[10px] uppercase tracking-widest font-mono text-[#5e7090] mb-4">Preset Templates</h3>
             <div className="space-y-2">
               {PRESETS.map((preset, i) => (
                 <button 
                   key={i} 
                   onClick={() => setPrompt(preset)}
                   className="w-full flex items-start gap-2 text-left p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                 >
                   <ChevronRight size={12} className="text-[#a855f7] mt-0.5 shrink-0" />
                   <p className="text-[11px] text-gray-400 leading-snug">{preset}</p>
                 </button>
               ))}
             </div>
           </div>
        </div>

        {/* Right Column: Main Editor */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/[0.01]">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-[#a855f7]/10 rounded-lg border border-[#a855f7]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] cursor-move">
                   <BrainCircuit className="text-[#c084fc] w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[1.1rem] font-medium text-white tracking-wide font-display">Command Center</h2>
                  <p className="text-xs text-[#9ca3af] font-sans">Automated topological network generation</p>
                </div>
             </div>
             
             {!isGenerating && (
               <div className="flex items-center gap-1.5">
                   <button 
                      onClick={() => setIsSettingsOpen(true)} 
                      className="p-1.5 text-gray-400 hover:text-[#c084fc] hover:bg-[#a855f7]/10 rounded-lg transition-colors border border-transparent hover:border-[#a855f7]/20"
                      title="AI Provider Settings"
                   >
                     <Settings className="w-4 h-4" />
                   </button>
                   <div className="w-px h-5 bg-white/10 mx-1"></div>
                   <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 rounded-lg transition-colors border border-transparent">
                     <X className="w-5 h-5" />
                   </button>
               </div>
             )}
          </div>

          {/* Editor Content Area */}
          <div className="p-8 flex-1 flex flex-col">
              {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-500">
                      <div className="relative mb-8 w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 border border-[#a855f7]/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
                          <div className="absolute inset-2 border-t border-b border-[#c084fc]/50 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                          <div className="absolute inset-4 bg-[#a855f7]/10 rounded-full blur-md animate-pulse"></div>
                          <BrainCircuit className="w-8 h-8 text-[#c084fc]" />
                      </div>
                      <h3 className="text-[1.2rem] font-display text-white mb-2 tracking-wide">Synthesizing Topology...</h3>
                      <p className="text-[#c084fc] font-mono text-[11px] uppercase tracking-widest max-w-[300px] truncate animate-pulse">{generationStep}</p>
                      
                      <div className="mt-8 w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#60a5fa] w-1/2 animate-[progress_1s_ease-in-out_infinite_alternate] rounded-full"></div>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col h-full animate-in fade-in">
                      <div className="flex justify-between items-end mb-3">
                          <label className="text-[10px] uppercase font-mono tracking-widest text-[#5e7090] flex items-center gap-2">
                              <Type className="w-3.5 h-3.5 text-[#c084fc]" /> Seed Prompt
                          </label>
                          {errorMsg && (
                              <span className="text-[10px] text-red-400 flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                                  <AlertTriangle className="w-3 h-3" /> {errorMsg}
                              </span>
                          )}
                      </div>
                      <div className="relative flex-1 min-h-[220px]">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter a strategic objective, analyze a complex topic, or paste an article..."
                            className={cn(
                                "absolute inset-0 w-full h-full bg-[#080c14]/50 border border-white/5 rounded-xl p-5 text-gray-200 placeholder-[#5e7090] resize-none transition-all text-[0.95rem] leading-[1.8] font-sans shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]",
                                "focus:outline-none focus:border-[#a855f7]/40 focus:ring-1 focus:ring-[#a855f7]/30",
                                errorMsg && "border-red-500/50 focus:border-red-500"
                            )}
                        />
                      </div>
                      
                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-5 mt-auto">
                          <div className="flex items-center gap-4 text-[#5e7090] font-mono text-[10px] uppercase tracking-wider">
                             <span>{prompt.length} / 5000 chars</span>
                             <span className="w-1 h-1 rounded-full bg-white/10"></span>
                             <span>~{estimatedNodes} Nodes</span>
                          </div>
                          <button 
                              onClick={handleGenerate}
                              disabled={!prompt.trim()}
                              className="group flex items-center gap-2 bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-white/5 disabled:text-[#5e7090] text-white px-5 py-2.5 rounded-lg font-medium text-[0.8rem] transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:shadow-none active:scale-95"
                          >
                              <Sparkles className="w-4 h-4" />
                              Construct Map
                          </button>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>
      
      <AiSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
