import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

export default function GraphEngine({ viewGraph, centerId, selectedNodeId, onNodeClick }) {
  const fgRef = useRef();
  const [hoverNode, setHoverNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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
    if (centerId && fgRef.current && viewGraph.nodes.length) {
      const node = viewGraph.nodes.find(n => n.id === centerId);
      if (node) {
        setTimeout(() => {
            if (fgRef.current) {
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(1.2, 1000);
            }
        }, 300);
      }
    }
  }, [centerId, viewGraph]);

  useEffect(() => {
    if (!fgRef.current) return;
    const charge = fgRef.current.d3Force('charge');
    const link = fgRef.current.d3Force('link');
    if (charge) charge.strength(-350);
    if (link) link.distance(80);
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
    ctx.save();
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = selectedNodeId === node.id;
    const isCenter = node.id === centerId || node.viewType === 'center';
    const isHistory = node.viewType === 'history';
    
    const isConnectedHover = hoverNode && hoverLinks.size > 0 && Array.from(hoverLinks).some(l => 
        (typeof l.source === 'object' ? l.source.id : l.source) === node.id || 
        (typeof l.target === 'object' ? l.target.id : l.target) === node.id
    );
    const dimOtherNodes = hoverNode && !isHovered && !isConnectedHover;

    let targetSize = TYPE_SIZES[node.type] || 5;
    if (isCenter) targetSize = 19;
    if (isHistory) targetSize = 7.5;

    // Birth animation
    const age = Date.now() - (node.createdAt || 0);
    const size = age < 500 ? targetSize * (1 - Math.pow(1 - age/500, 3)) : targetSize;

    let fillColor = 'transparent';
    let strokeColor = '#ffffff';
    let strokeWidth = 1.5;

    // Colors
    if (isCenter) {
        fillColor = '#806433'; 
        strokeColor = '#d4af37'; 
        strokeWidth = 2;
    } else if (isHistory) {
        strokeColor = '#a855f7'; 
        strokeWidth = 1.2;
    } else if (node.type === 'macro' || node.type === 'central_hub') {
        strokeColor = '#d4af37'; // gold
    } else if (node.type === 'trend' || node.type === 'key_driver') {
        strokeColor = '#60a5fa'; // blue
    } else if (node.type === 'risk') {
        strokeColor = '#ef4444'; // red
    }

    if (dimOtherNodes) {
        strokeColor = isHistory ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        fillColor = isCenter ? 'rgba(128, 100, 51, 0.4)' : 'transparent';
    } else if (isHovered || isConnectedHover) {
       ctx.shadowColor = 'rgba(96,165,250,0.75)';
       ctx.shadowBlur = 15;
    }

    // Node body
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    
    if (strokeWidth > 0) {
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
    const fontSize = Math.max(10 / globalScale, 2.5);
    
    if (isCenter && !dimOtherNodes) {
        ctx.font = `700 ${fontSize}px "Instrument Serif", serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y);
    } else if (!dimOtherNodes) {
        ctx.font = `500 ${fontSize}px "Geist", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHovered ? 'rgba(255, 255, 255, 0.95)' : 
                       isSelected ? 'rgba(255, 255, 255, 0.75)' : 
                       'rgba(255, 255, 255, 0.28)';
        ctx.fillText(label, node.x, node.y - size - (fontSize * 0.8));
    }
    ctx.restore();
  }, [hoverNode, hoverLinks, centerId, selectedNodeId]);

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

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    const age = Date.now() - (link.createdAt || 0);
    if (age < 600) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        ctx.setLineDash([len, len]);
        ctx.lineDashOffset = len * (1 - age/600);
    } else {
        ctx.setLineDash(link.isHistoryPointer ? [2/globalScale, 4/globalScale] : []);
    }

    if (link.isHistoryPointer) {
         opacity = 0.3;
         ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
    } else {
        if (isConnectedHover) {
            lineWidth = 1.2 / globalScale;
            opacity = 0.9;
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
        } else if (dimOtherLinks) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            lineWidth = 0.4 / globalScale;
        } else {
            ctx.strokeStyle = isRed ? `rgba(201, 74, 74, ${opacity + 0.05})` : `rgba(255, 255, 255,  ${opacity})`;
        }
    }
    
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]); 
  }, [hoverNode, hoverLinks]);

  const renderCanvasPre = useCallback((ctx, globalScale) => {
      if(!fgRef.current) return;
      const W = dimensions.width;
      const H = dimensions.height;
      const t = fgRef.current.screen2GraphCoords(0, 0);
      const b = fgRef.current.screen2GraphCoords(W, H);
      
      if (isNaN(t.x) || isNaN(t.y) || isNaN(b.x) || isNaN(b.y)) return;
      
      const drift1 = Math.sin(Date.now() * 0.00008) * 30;
      const drift2 = Math.cos(Date.now() * 0.00008) * 30;
      
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0); 
      
      let grd1 = ctx.createRadialGradient(W*0.75 + drift1, H*0.2 - drift2, 0, W*0.75 + drift1, H*0.2 - drift2, 350);
      grd1.addColorStop(0, 'rgba(168,85,247,0.015)');
      grd1.addColorStop(1, 'rgba(168,85,247,0)');
      ctx.fillStyle = grd1;
      ctx.fillRect(0, 0, W, H);
      
      let grd2 = ctx.createRadialGradient(W*0.2 - drift1, H*0.8 + drift2, 0, W*0.2 - drift1, H*0.8 + drift2, 400);
      grd2.addColorStop(0, 'rgba(74,127,212,0.012)');
      grd2.addColorStop(1, 'rgba(74,127,212,0)');
      ctx.fillStyle = grd2;
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

      if (centerId && sortedGraph.nodes.length) {
          const center = sortedGraph.nodes.find(n => n.id === centerId);
          if (center && center.x !== undefined) {
             const cgrd = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 300);
             cgrd.addColorStop(0, 'rgba(201,168,76,0.05)');
             cgrd.addColorStop(1, 'rgba(201,168,76,0)');
             ctx.fillStyle = cgrd;
             ctx.fillRect(center.x - 300, center.y - 300, 600, 600);
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

  return (
    <div className="absolute inset-0 bg-background overflow-hidden cursor-move">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={sortedGraph}
        nodeLabel={() => ''}
        nodeCanvasObject={drawNode}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={drawLink}
        onRenderFramePre={renderCanvasPre}
        onRenderFramePost={renderCanvasPost}
        onNodeClick={onNodeClick}
        onNodeHover={setHoverNode}
        warmupTicks={100}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}
