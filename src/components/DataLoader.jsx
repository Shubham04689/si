import React, { useRef, useState } from 'react';
import { UploadCloud, FileJson, AlertCircle } from 'lucide-react';
import { validateMapData } from '../utils/SchemaValidator';

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

        let initialCenterId = json.nodes[0]?.id;
        let maxConnections = -1;
        
        Object.entries(connectionCounts).forEach(([nodeId, count]) => {
           if (count > maxConnections) {
             maxConnections = count;
             initialCenterId = nodeId;
           }
        });

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

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background text-white p-6 z-50">
      <div className="max-w-md w-full bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-6">
            <UploadCloud size={32} />
          </div>
          <h1 className="text-2xl font-light mb-2">Strategic Intelligence</h1>
          <p className="text-gray-400 text-sm">Upload your JSON transformation map schema to begin exploring data.</p>
        </div>

        <div 
          onClick={() => !loading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/50 transition-all rounded-xl p-8 text-center cursor-pointer group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json,application/json" 
            className="hidden" 
          />
          <FileJson className="mx-auto text-gray-500 group-hover:text-blue-400 mb-4 transition-colors" size={40} />
          <p className="text-gray-300 font-medium">Click to select JSON file</p>
          <p className="text-gray-500 text-xs mt-2">Strict Schema format required</p>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="shrink-0" size={18} />
            <p>{error}</p>
          </div>
        )}
        
        {loading && (
            <div className="mt-6 text-center text-blue-400 text-sm animate-pulse">
                Processing schema map...
            </div>
        )}
      </div>
    </div>
  );
}
