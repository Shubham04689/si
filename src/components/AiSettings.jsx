import React, { useState, useEffect } from 'react';
import { Settings, X, Server, Key, Box, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from './IntelligencePanel';

export default function AiSettings({ isOpen, onClose }) {
  const [endpoint, setEndpoint] = useState('http://localhost:11434/v1');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, success, error
  const [errorMessage, setErrorMessage] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const savedEndpoint = localStorage.getItem('ai_endpoint');
    const savedKey = localStorage.getItem('ai_api_key');
    const savedModel = localStorage.getItem('ai_model');
    
    if (savedEndpoint) setEndpoint(savedEndpoint);
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('ai_endpoint', endpoint);
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_model', selectedModel);
  }, [endpoint, apiKey, selectedModel]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    setConnectionStatus('idle');
    setErrorMessage('');
    
    try {
      // Remove trailing slash if present
      const baseUrl = endpoint.replace(/\/$/, '');
      const headers = {
          'Content-Type': 'application/json'
      };
      if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers,
      });

      if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Handle standard OpenAI format { data: [{id: 'llama2'}, ...] } 
      // or raw array format depending on provider quirks
      let fetchedModels = [];
      if (data && data.data && Array.isArray(data.data)) {
          fetchedModels = data.data;
      } else if (Array.isArray(data)) {
          fetchedModels = data;
      } else if (data && data.models && Array.isArray(data.models)) {
          // Ollama specific non-standard sometimes
          fetchedModels = data.models;
      }

      if (fetchedModels.length > 0) {
          setModels(fetchedModels);
          setConnectionStatus('success');
          // Auto-select first model if current isn't valid
          if (!fetchedModels.find(m => (m.id || m.name) === selectedModel)) {
              setSelectedModel(fetchedModels[0].id || fetchedModels[0].name);
          }
      } else {
          throw new Error("No models found at this endpoint.");
      }

    } catch (err) {
      console.error("Failed to fetch models:", err);
      setConnectionStatus('error');
      setErrorMessage(err.message || 'Failed to connect. Check URL/CORS.');
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-md transition-all">
       <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-gray-300">
                   <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">AI Provider Settings</h2>
                  <p className="text-xs text-gray-400">Configure Local or Remote LLMs</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="p-6 space-y-6">
             
             {/* Endpoint URL */}
             <div>
                <label className="text-xs font-medium text-gray-400 flex items-center gap-2 mb-2">
                    <Server className="w-3.5 h-3.5" /> API Base URL
                </label>
                <input 
                    type="text" 
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1 for Ollama"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                />
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Must point to an OpenAI-compatible /v1 endpoint.</p>
             </div>

             {/* API Key */}
             <div>
                <label className="text-xs font-medium text-gray-400 flex items-center gap-2 mb-2">
                    <Key className="w-3.5 h-3.5" /> API Key (Optional for Local)
                </label>
                <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                />
             </div>

             {/* Model Selection */}
             <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-400 flex items-center gap-2">
                        <Box className="w-3.5 h-3.5" /> Target Model
                    </label>
                    <button 
                        onClick={fetchModels}
                        disabled={isLoadingModels || !endpoint}
                        className="text-xs flex items-center gap-1.5 text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors bg-purple-500/10 px-2 py-1 rounded"
                    >
                        <RefreshCw className={cn("w-3 h-3", isLoadingModels && "animate-spin")} />
                        Fetch Models
                    </button>
                </div>

                {connectionStatus === 'error' && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <span className="text-xs text-red-300 leading-snug">{errorMessage}</span>
                    </div>
                )}

                {connectionStatus === 'success' && models.length > 0 ? (
                   <select 
                       value={selectedModel}
                       onChange={(e) => setSelectedModel(e.target.value)}
                       className="w-full bg-gray-950 border border-purple-500/30 rounded-xl p-3 text-sm text-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none"
                   >
                       {models.map((m, i) => (
                           <option key={i} value={m.id || m.name}>
                               {m.id || m.name}
                           </option>
                       ))}
                   </select>
                ) : (
                   <input 
                       type="text" 
                       value={selectedModel}
                       onChange={(e) => setSelectedModel(e.target.value)}
                       placeholder="e.g. llama3, mixtral, gpt-4o"
                       className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all"
                   />
                )}
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Type manually if offline, or click 'Fetch Models'.</p>
             </div>
             
          </div>

          <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800 flex justify-end">
             <button 
                 onClick={onClose}
                 className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg"
             >
                 Save & Close
             </button>
          </div>
       </div>
    </div>
  );
}
