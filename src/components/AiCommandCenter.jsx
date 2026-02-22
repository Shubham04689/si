import React, { useState } from 'react';
import { Sparkles, X, BrainCircuit, Type, Settings, AlertTriangle } from 'lucide-react';
import { cn } from './IntelligencePanel';
import AiSettings from './AiSettings';

export default function AiCommandCenter({ isOpen, onClose, onMapGenerated }) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setErrorMsg('');
    setIsGenerating(true);
    setGenerationStep("Initializing Universal API Connection...");

    try {
        const endpoint = localStorage.getItem('ai_endpoint') || 'http://localhost:11434/v1';
        const apiKey = localStorage.getItem('ai_api_key') || '';
        const model = localStorage.getItem('ai_model') || 'llama3';

        const baseUrl = endpoint.replace(/\/$/, '');
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        // Schema instruction
        const systemPrompt = `You are a highly advanced Intelligence Analyst. Your task is to output a Strategic Intelligence Map strictly in JSON format based on the user's prompt. Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Just output raw parsable JSON.
        
The JSON exactly match this schema:
{
  "meta": {
    "title": "A short, brilliant title (max 5 words)",
    "description": "A 1-sentence description."
  },
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
3. Generate 5+ 'peripheral_topic' nodes connected to the trends. (size 15)
4. Ensure 'source' and 'target' in 'links' exactly match the 'id' of nodes. Use underscore_case for IDs.
5. All 'relation' fields must be short verbs (e.g., Causes, Requires, Prevents).`;

        setGenerationStep(`Requesting synthesis from model: ${model}...`);

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                stream: false
            })
        });

        if (!res.ok) {
            throw new Error(`API Error ${res.status}: ${res.statusText}`);
        }

        setGenerationStep("Parsing knowledge structure...");
        const data = await res.json();
        const content = data.choices[0].message.content;

        // Clean up markdown markers if the LLM ignored our "no markdown" instruction
        let cleanContent = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        
        // Robust JSON extraction: Find first { and last }
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
             throw new Error("Could not locate valid JSON object in response.");
        }
        
        cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        
        const generatedMap = JSON.parse(cleanContent);
        
        // Validation: Verify it has nodes and links
        if (!generatedMap.nodes || !generatedMap.links || !Array.isArray(generatedMap.nodes)) {
            throw new Error("Model failed to return valid graph schema.");
        }

        // Auto-detect the center (should be the 'macro' type according to prompt)
        let centerId = generatedMap.nodes.find(n => n.type === 'macro')?.id;
        if (!centerId) centerId = generatedMap.nodes[0].id; // fallback

        setIsGenerating(false);
        setPrompt("");
        setGenerationStep("");
        onMapGenerated(generatedMap, centerId);

    } catch (err) {
        console.error("AI Generation Failed:", err);
        setErrorMsg(err.message || "Failed to generate map. Check your AI Settings and ensure the model is running.");
        setIsGenerating(false);
        setGenerationStep("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-md transition-all duration-300">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]"></div>
      </div>

      <div className={cn(
          "relative w-full max-w-4xl bg-gray-900 border shadow-2xl overflow-hidden transition-all duration-500 rounded-3xl",
          isGenerating ? "border-purple-500/50 shadow-purple-500/10" : "border-gray-800"
      )}>
          
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-800 bg-gray-900/50">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
                 <BrainCircuit className="text-purple-400 w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white tracking-tight">AI Command Center</h2>
                <p className="text-sm text-gray-400">Generate complex strategic maps from long-form prompts</p>
              </div>
           </div>
           
           {!isGenerating && (
             <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors shrink-0"
                    title="AI Provider Settings"
                 >
                   <Settings className="w-5 h-5" />
                 </button>
                 <div className="w-px h-6 bg-gray-800 mx-1"></div>
                 <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0">
                   <X className="w-5 h-5" />
                 </button>
             </div>
           )}
        </div>

        {/* Content Area */}
        <div className="p-8">
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                    <div className="relative mb-8">
                        {/* Fake Skeleton Graph Pulses */}
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                        <BrainCircuit className="w-16 h-16 text-purple-400 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-light text-white mb-2 tracking-wide">Synthesizing Network</h3>
                    <p className="text-purple-300 font-mono text-sm animate-pulse">{generationStep}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Type className="w-4 h-4 text-purple-400" /> Research Prompt
                            </label>
                            {errorMsg && (
                                <span className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                                    <AlertTriangle className="w-3 h-3" /> {errorMsg}
                                </span>
                            )}
                        </div>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Paste your comprehensive research prompt or document text here. The AI will autonomously build a massive strategic map identifying core themes, trends, and peripheral issues based on this context..."
                            className={cn(
                                "w-full h-64 bg-gray-950/50 border rounded-2xl p-6 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 resize-none transition-all text-base leading-relaxed",
                                errorMsg ? "border-red-500/50 focus:border-red-500 focus:ring-red-500" : "border-gray-800 focus:border-purple-500/50 focus:ring-purple-500/50"
                            )}
                        />
                    </div>
                    
                    <div className="flex justify-end pt-2">
                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt.trim()}
                            className="group flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-500 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg hover:shadow-purple-500/25"
                        >
                            <Sparkles className="w-5 h-5 group-disabled:opacity-50" />
                            Generate Full Strategy Map
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <AiSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
