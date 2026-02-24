import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize, Lock, Unlock } from 'lucide-react';

const TYPE_SIZES = {
  macro: 19,
  central_hub: 19,
  trend: 12,
  key_driver: 12,
  concept: 12,
  issue: 7.5,
  detail: 7.5,
  peripheral_topic: 5,
  satellite: 5,
  risk: 9,
  history: 7.5
};

const TIER_ORDER = { satellite: 1, peripheral_topic: 1, issue: 1, detail: 1, history: 2, trend: 3, key_driver: 3, concept: 3, macro: 4, central_hub: 4, center: 5 };

export default function GraphEngine({ viewGraph, centerId, isEditMode, selectedNodeId, onNodeClick, onNodeRightClick, onAddNodeClick, onRemoveNodeClick }) {
  const fgRef = useRef();
  const requestRef = useRef();
  const ripplesRef = useRef([]);
  const [hoverNode, setHoverNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isZoomLocked, setIsZoomLocked] = useState(false);

  // Auto layout forces
  useEffect(() => {
    if (!fgRef.current) return;
    const charge = fgRef.current.d3Force('charge');
    const link = fgRef.current.d3Force('link');
    if (charge) charge.strength(-600);
    if (link) link.distance(110);
  }, []);

  const handleZoomToFit = useCallback(() => {
    if (fgRef.current) {
        fgRef.current.zoomToFit(800, 80);
    }
  }, []);

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (centerId && fgRef.current && viewGraph.nodes.length && !isZoomLocked) {
      const node = viewGraph.nodes.find(n => n.id === centerId);
      if (node) {
        setTimeout(() => {
            if (fgRef.current && !isZoomLocked) {
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(1.2, 1000);
            }
        }, 300);
      }
    }
  }, [centerId, viewGraph, isZoomLocked]);

  useEffect(() => {
    const animateRipples = () => {
      if (fgRef.current) {
        fgRef.current.refresh(); // Request a repaint
      }
      requestRef.current = requestAnimationFrame(animateRipples);
    };
    requestRef.current = requestAnimationFrame(animateRipples);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const bgStars = useMemo(() => {
    const stars = [];
    for(let i=0; i<80; i++) {
       stars.push({
         x: (Math.random() - 0.5) * 3000,
         y: (Math.random() - 0.5) * 3000,
         r: 0.4 + Math.random() * 0.8,
         opacity: 0.04 + Math.random() * 0.12
       });
    }
    return stars;
  }, []);

  const sortedGraph = useMemo(() => {
     if(!viewGraph) return {nodes:[], links:[]};
     const nodes = [...viewGraph.nodes].map(n => ({...n, createdAt: n.createdAt || Date.now()}))
         .sort((a,b) => (TIER_ORDER[a.type] || 0) - (TIER_ORDER[b.type] || 0));
     const links = [...viewGraph.links].map(l => ({...l, createdAt: l.createdAt || Date.now()}));
     return { nodes, links };
  }, [viewGraph]);

  const hoverLinks = useMemo(() => {
    if (!hoverNode) return new Set();
    const links = new Set();
    sortedGraph.links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (srcId === hoverNode.id || tgtId === hoverNode.id) {
        links.add(l);
      }
    });
    return links;
  }, [hoverNode, sortedGraph.links]);

  const drawNode = useCallback((node, ctx, globalScale) => {
    if (typeof node.x !== 'number' || typeof node.y !== 'number') return;
    ctx.save();
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = selectedNodeId === node.id;
    const isCenter = node.id === centerId || node.viewType === 'center';
    const isHistory = node.viewType === 'history';
    
    let targetSize = TYPE_SIZES[node.type] || 5;
    if (isCenter) targetSize = 19;
    if (isHistory) targetSize = 7.5;
    
    const isConnectedHover = hoverNode && hoverLinks.size > 0 && Array.from(hoverLinks).some(l => 
        (typeof l.source === 'object' ? l.source.id : l.source) === node.id || 
        (typeof l.target === 'object' ? l.target.id : l.target) === node.id
    );
    const dimOtherNodes = hoverNode && !isHovered && !isConnectedHover;

    // Birth animation
    const age = Date.now() - (node.createdAt || 0);
    const scaleIn = age < 500 ? (1 - Math.pow(1 - age/500, 3)) : 1;
    let size = targetSize * scaleIn;

    let fillColor = 'transparent';
    let strokeColor = '#ffffff';
    let strokeWidth = 1.0;
    
    // Glassmorphism Center Hub
    if (isCenter) {
        fillColor = 'rgba(20, 20, 40, 0.7)'; // Frosted dark
        strokeWidth = 2;
    } else if (isHistory) {
        strokeColor = '#a855f7'; 
        strokeWidth = 1;
    } else if (node.type === 'macro' || node.type === 'central_hub') {
        fillColor = 'transparent'; 
        strokeColor = 'rgba(255, 255, 255, 0.5)'; 
    } else if (node.type === 'trend' || node.type === 'key_driver') {
        strokeColor = '#60a5fa'; 
    } else if (node.type === 'risk') {
        strokeColor = '#ef4444'; 
    }

    if (dimOtherNodes) {
        strokeColor = isHistory ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        fillColor = isCenter ? 'rgba(20, 20, 40, 0.3)' : 'transparent';
    } else if (isHovered || isConnectedHover) {
       if (!isCenter) {
         size *= 1.3; // scale up on hover
         ctx.shadowColor = 'rgba(74, 144, 217, 0.8)';
         ctx.shadowBlur = 12;
       }
    }

    // Node body
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    
    // Apply center hub gradient stroke
    if (isCenter && !dimOtherNodes) {
        const grd = ctx.createLinearGradient(node.x - size, node.y - size, node.x + size, node.y + size);
        grd.addColorStop(0, '#4A90D9');
        grd.addColorStop(1, '#9B59B6');
        strokeColor = grd;
        
        // Pulsing glow animation
        const pulse = Math.sin(Date.now() * 0.002) * 0.5 + 0.5; // 0 to 1
        ctx.shadowBlur = 20 + (pulse * 30);
        ctx.shadowColor = `rgba(74, 144, 217, ${0.3 + pulse * 0.3})`;
    } else if (!dimOtherNodes && (node.type === 'trend' || node.type === 'key_driver' || node.type === 'issue')) {
        // Inner Ring Gradient Fill
        const radGrd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size);
        radGrd.addColorStop(0, '#ffffff');
        radGrd.addColorStop(1, '#4A90D9');
        fillColor = radGrd;
        strokeColor = 'transparent';
    } else if (!dimOtherNodes && (node.type === 'satellite' || node.type === 'peripheral_topic')) {
        // Outer Ring - hollow
        fillColor = 'transparent';
        if (isConnectedHover) strokeColor = '#F5A623'; // amber accent
    }

    if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    
    if (strokeWidth > 0 && strokeColor !== 'transparent') {
        ctx.lineWidth = strokeWidth / globalScale;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
    
    // Halos
    if (isCenter && !dimOtherNodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)'; 
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 16, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.07)'; 
        ctx.lineWidth = 0.8 / globalScale;
        ctx.stroke();
    }
    
    // Pinned nodes
    if (node.fx !== undefined || node.pinned) {
        ctx.fillStyle = 'rgba(201,168,76,0.5)';
        ctx.font = `500 ${Math.max(6 / globalScale, 2)}px "Geist Mono", monospace`;
        ctx.fillText('⊕', node.x, node.y + size + 4);
    }
    
    // Content gold dot
    if (node.content && node.content.summary && !dimOtherNodes && !isCenter) {
        ctx.beginPath();
        ctx.arc(node.x + size*0.7, node.y - size*0.7, 2/globalScale, 0, 2*Math.PI);
        ctx.fillStyle = '#c9a84c';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(201,168,76,0.8)';
        ctx.fill();
        ctx.shadowBlur = (isHovered || isConnectedHover) ? 15 : 0;
        ctx.shadowColor = 'rgba(96,165,250,0.75)';
    }

    // Selected state orbiting ring
    if (isSelected && !dimOtherNodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 9, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1 / globalScale;
        const startAngle = (Date.now() * 0.001) % (Math.PI * 2);
        const dash = 4 / globalScale;
        const gap = 8 / globalScale;
        ctx.setLineDash([dash, gap]);
        ctx.lineDashOffset = -startAngle * size;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Labels
    const label = node.label || node.id;
    const isOuter = node.type === 'satellite' || node.type === 'peripheral_topic';
    
    if (isCenter && !dimOtherNodes) {
        ctx.font = `700 ${30/globalScale}px "Inter", "Geist", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8 / globalScale;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y);
        ctx.shadowBlur = 0;
    } else if (!dimOtherNodes) {
        const fontSize = Math.max(isOuter ? 9 : 13 / globalScale, 2.5);
        ctx.font = `${isOuter ? 400 : 600} ${fontSize}px "Inter", "Geist", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = (isHovered || isConnectedHover) ? 'rgba(255, 255, 255, 1)' : 
                        isOuter ? 'rgba(204, 204, 204, 0.75)' : 
                        'rgba(255, 255, 255, 0.9)';
        
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4 / globalScale;
        ctx.fillText(label, node.x, node.y - size - (fontSize * 0.8));
        ctx.shadowBlur = 0;
    }

    // Update Ripples
    const now = Date.now();
    ripplesRef.current = ripplesRef.current.filter(r => now - r.start < 600);
    ripplesRef.current.forEach(ripple => {
        if (ripple.id === node.id) {
           const progress = (now - ripple.start) / 600;
           ctx.beginPath();
           ctx.arc(ripple.x, ripple.y, size + (progress * 50 / globalScale), 0, 2 * Math.PI);
           ctx.strokeStyle = `rgba(255,255,255,${(1 - progress) * 0.5})`;
           ctx.lineWidth = 1.5 / globalScale;
           ctx.stroke();
        }
    });

    // Badges (+ and -)
    if (!dimOtherNodes && node.id) { // Ensure node has data
        const btnRadius = 6/globalScale;
        
        // + button (always visible)
        const plusX = node.x + targetSize + 8/globalScale;
        const plusY = node.y;
        
        ctx.beginPath();
        ctx.arc(plusX, plusY, btnRadius, 0, 2*Math.PI);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'; // blue-500
        ctx.fill();
        ctx.lineWidth = 1/globalScale;
        ctx.strokeStyle = '#2563eb'; // blue-600
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${10/globalScale}px sans-serif`;
        ctx.fillText('+', plusX, plusY + 0.5/globalScale);
        
        // - button (visible in edit mode)
        if (isEditMode && node.id !== centerId) { 
            const minusX = node.x + targetSize*0.7;
            const minusY = node.y - targetSize - 6/globalScale;
            
            ctx.beginPath();
            ctx.arc(minusX, minusY, btnRadius, 0, 2*Math.PI);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'; // red-500
            ctx.fill();
            ctx.strokeStyle = '#dc2626'; // red-600
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${8/globalScale}px sans-serif`;
            ctx.fillText('−', minusX, minusY + 0.5/globalScale); 
        }
    }

    ctx.restore();
  }, [hoverNode, hoverLinks, centerId, selectedNodeId, isEditMode]);

  const drawLink = useCallback((link, ctx, globalScale) => {
    const isConnectedHover = hoverLinks.has(link);
    const dimOtherLinks = hoverNode && !isConnectedHover;

    const source = link.source;
    const target = link.target;
    if (!source || !target || typeof source.x !== 'number' || typeof target.x !== 'number') return;

    const sType = source.type || 'detail';
    const tType = target.type || 'detail';
    
    let baseOpacity = 0.2;
    let baseWidth = 0.4;
    let isRed = false;

    if ((sType === 'macro' || sType === 'central_hub') && (tType === 'macro' || tType === 'central_hub')) {
        baseOpacity = 0.55; baseWidth = 0.8;
    } else if ((sType === 'macro' || sType === 'central_hub') && (tType === 'trend' || tType === 'key_driver') || (tType === 'macro' || tType === 'central_hub') && (sType === 'trend' || sType === 'key_driver')) {
        baseOpacity = 0.35; baseWidth = 0.5;
    }
    
    if (sType === 'risk' || tType === 'risk') {
        isRed = true;
    }

    let lineWidth = baseWidth / globalScale;
    let opacity = baseOpacity;

    // Connector gradients
    if (!dimOtherLinks) {
       const lineGrd = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
       if (sType === 'macro' || sType === 'central_hub') {
          lineGrd.addColorStop(0, `rgba(74, 144, 217, ${opacity + (isConnectedHover ? 0.4 : 0.3)})`);
       } else {
          lineGrd.addColorStop(0, `rgba(255, 255, 255, ${opacity + (isConnectedHover ? 0.3 : 0)})`);
       }
       lineGrd.addColorStop(1, `rgba(255, 255, 255, ${opacity * (isConnectedHover ? 1.0 : 0.5)})`);
       
       ctx.strokeStyle = isRed && !isConnectedHover ? `rgba(201, 74, 74, ${opacity + 0.1})` : lineGrd;
       
       // Highlighted line instead of particles
       if (isConnectedHover) {
           lineWidth = lineWidth * 2.5;
           ctx.shadowColor = 'rgba(74, 144, 217, 0.8)';
           ctx.shadowBlur = 8 / globalScale;
       }
    } else {
       ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    }

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [hoverNode, hoverLinks]);

  const renderCanvasPre = useCallback((ctx, globalScale) => {
      if(!fgRef.current) return;
      const W = dimensions.width;
      const H = dimensions.height;
      const t = fgRef.current.screen2GraphCoords(0, 0);
      const b = fgRef.current.screen2GraphCoords(W, H);
      
      if (isNaN(t.x) || isNaN(t.y) || isNaN(b.x) || isNaN(b.y)) return;
      
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0); 
      
      // 1. New Deep Space Background
      let grd1 = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H)*0.8);
      grd1.addColorStop(0, '#0a0a1a');
      grd1.addColorStop(1, '#000005');
      ctx.fillStyle = grd1;
      ctx.fillRect(0, 0, W, H);

      bgStars.forEach(s => {
          const sp = fgRef.current.graph2ScreenCoords(s.x, s.y);
          if (sp.x > -10 && sp.x < W+10 && sp.y > -10 && sp.y < H+10) {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, s.r * globalScale, 0, 2*Math.PI);
              ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
              ctx.fill();
          }
      });
      ctx.restore();

      const drawGrid = (step, color, width) => {
          ctx.beginPath();
          for(let x = Math.floor(t.x / step) * step; x < b.x; x += step) {
              ctx.moveTo(x, t.y); ctx.lineTo(x, b.y);
          }
          for(let y = Math.floor(t.y / step) * step; y < b.y; y += step) {
              ctx.moveTo(t.x, y); ctx.lineTo(b.x, y);
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = width / globalScale;
          ctx.stroke();
      };
      drawGrid(20, 'rgba(255,255,255,0.014)', 0.4);
      drawGrid(100, 'rgba(255,255,255,0.04)', 0.7);

      ctx.beginPath();
      ctx.moveTo(-20, 0); ctx.lineTo(20, 0);
      ctx.moveTo(0, -20); ctx.lineTo(0, 20);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, 2*Math.PI);
      ctx.stroke();

      // 2. Centered Orbital Rings
      if (centerId && sortedGraph.nodes.length) {
          const center = sortedGraph.nodes.find(n => n.id === centerId);
          if (center && center.x !== undefined) {
             ctx.beginPath();
             ctx.arc(center.x, center.y, 110, 0, 2*Math.PI);
             ctx.moveTo(center.x + 220, center.y); // move to outer ring start
             ctx.arc(center.x, center.y, 220, 0, 2*Math.PI);
             ctx.strokeStyle = 'rgba(255,255,255,0.04)';
             ctx.lineWidth = 1 / globalScale;
             ctx.setLineDash([4/globalScale, 8/globalScale]);
             ctx.stroke();
             ctx.setLineDash([]);
          }
      }
  }, [dimensions, bgStars, centerId, sortedGraph]);

  const renderCanvasPost = useCallback((ctx, globalScale) => {
      if(!fgRef.current) return;
      const W = dimensions.width;
      const H = dimensions.height;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0); 
      
      const rad = Math.max(W,H)*0.75;
      const vgrd = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.35, W/2, H/2, rad);
      vgrd.addColorStop(0, 'rgba(8,12,20,0)');
      vgrd.addColorStop(1, 'rgba(8,12,20,0.6)');
      ctx.fillStyle = vgrd;
      ctx.fillRect(0, 0, W, H);

      const t = fgRef.current.screen2GraphCoords(W/2, H/2);
      ctx.fillStyle = 'rgba(74,90,114,0.5)';
      ctx.font = '9px "Geist Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`X: ${Math.round(t.x)}  Y: ${Math.round(t.y)}  Z: ${globalScale.toFixed(2)}×`, W - 30, H - 30);
      
      ctx.restore();
  }, [dimensions]);

  const nodePointerAreaPaint = useCallback((node, color, ctx, globalScale) => {
    ctx.fillStyle = color;
    let targetSize = TYPE_SIZES[node.type] || 5;
    const isCenter = node.id === centerId || node.viewType === 'center';
    const isHistory = node.viewType === 'history';
    if (isCenter) targetSize = 19;
    if (isHistory) targetSize = 7.5;
    
    // Draw main circle hit area
    ctx.beginPath();
    ctx.arc(node.x, node.y, targetSize, 0, 2 * Math.PI, false);
    ctx.fill();

    const btnRadius = 6 / globalScale;
    const hoverLeniency = 4 / globalScale;

    // + button hit area
    ctx.beginPath();
    ctx.arc(node.x + targetSize + 8/globalScale, node.y, btnRadius + hoverLeniency, 0, 2*Math.PI, false);
    ctx.fill();
    
    // - button hit area
    if (isEditMode && node.id !== centerId) {
       ctx.beginPath();
       ctx.arc(node.x + targetSize*0.7, node.y - targetSize - 6/globalScale, btnRadius + hoverLeniency, 0, 2*Math.PI, false);
       ctx.fill();
    }
  }, [centerId, isEditMode]);

  const handleNodeClickWrap = useCallback((node, event) => {
      if (!fgRef.current) return;
      
      const { x: graphX, y: graphY } = fgRef.current.screen2GraphCoords(event.clientX, event.clientY);
      const globalScale = fgRef.current.zoom();
      
      let targetSize = TYPE_SIZES[node.type] || 5;
      if (node.id === centerId || node.viewType === 'center') targetSize = 19;
      if (node.viewType === 'history') targetSize = 7.5;

      const btnRadius = 6 / globalScale;
      const hitLeniency = 2 / globalScale;
      
      // Check + button
      const plusX = node.x + targetSize + 8/globalScale;
      const plusY = node.y;
      
      if (Math.hypot(graphX - plusX, graphY - plusY) <= btnRadius + hitLeniency) {
         if (onAddNodeClick) onAddNodeClick(node, event);
         return; // We handled the click
      }

      // Check - button
      if (isEditMode && node.id !== centerId) {
          const minusX = node.x + targetSize * 0.7;
          const minusY = node.y - targetSize - 6/globalScale;
          if (Math.hypot(graphX - minusX, graphY - minusY) <= btnRadius + hitLeniency) {
             if (onRemoveNodeClick) onRemoveNodeClick(node);
             return;
          }
      }

      // Default click behavior
      if (onNodeClick) onNodeClick(node, event);
  }, [centerId, isEditMode, onAddNodeClick, onRemoveNodeClick, onNodeClick]);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden cursor-move">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={sortedGraph}
        nodeLabel={() => ''}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={drawLink}
        onRenderFramePre={renderCanvasPre}
        onRenderFramePost={renderCanvasPost}
        onNodeClick={handleNodeClickWrap}
        onNodeRightClick={onNodeRightClick}
        onNodeHover={setHoverNode}
        warmupTicks={100}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
      
      {/* Viewport Zoom Controls */}
      <div className="absolute bottom-10 left-6 flex flex-col gap-2 z-10">
        <button 
           onClick={handleZoomToFit} 
           className="p-2 bg-[#131a28]/80 text-gray-400 hover:text-white border border-white/10 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors"
           title="Zoom to Fit"
        >
           <Maximize size={16} />
        </button>
        <button 
           onClick={() => setIsZoomLocked(prev => !prev)} 
           className={`p-2 border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md transition-colors ${
             isZoomLocked 
             ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30' 
             : 'bg-[#131a28]/80 text-gray-400 hover:text-white border-white/10'
           }`}
           title={isZoomLocked ? "Unlock Auto-Zoom/Pan" : "Lock Current View"}
        >
           {isZoomLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
      </div>
    </div>
  );
}
