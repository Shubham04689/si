import React from 'react';
import { X, FileText, ExternalLink, BarChart2, AlertTriangle, MessageSquare, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IntelligencePanel({ node, isOpen, onClose }) {
  return (
    <div className={cn(
        "fixed top-0 right-0 h-full w-[450px] bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl p-6 transition-transform duration-500 ease-in-out z-40 overflow-y-auto overflow-x-hidden",
        isOpen ? "translate-x-0" : "translate-x-full"
    )}>
      {node && (
        <>
          <div className="flex items-start justify-between mb-8">
            <div>
              <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase mb-2 block">
                {node.type === 'macro' ? 'Macro Trend' : node.type === 'trend' ? 'Key Trend' : 'Strategic Issue'}
              </span>
              <h2 className="text-3xl font-light text-white leading-tight">{node.label}</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-8 pb-12">
            
            {/* 1. Executive Summary */}
            {node.content?.summary && (
              <section>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-blue-400" /> Executive Summary
                </h3>
                <div className="text-gray-400 text-sm leading-relaxed">
                    {node.content.summary}
                </div>
              </section>
            )}

            {/* 2. Key Insight (Highlighted block) */}
            {node.content?.key_insight && (
              <section className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h3 className="text-xs font-semibold text-blue-400 uppercase mb-2">Key Insight</h3>
                <p className="text-blue-100/90 text-[15px] italic leading-snug">
                  "{node.content.key_insight}"
                </p>
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
            
          </div>
          
          {/* Decorative footer element */}
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
            <span>Strategic Intelligence Map</span>
            <span>v2.0.0</span>
          </div>
        </>
      )}
    </div>
  );
}
