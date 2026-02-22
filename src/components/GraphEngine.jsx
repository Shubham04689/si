import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

export default function GraphEngine({ viewGraph, centerId, onNodeClick }) {
  const fgRef = useRef();
  const [hoverNode, setHoverNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resize for full screen graph
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Animate camera to center node when centerId changes
  useEffect(() => {
    if (centerId && fgRef.current && viewGraph.nodes.length) {
      const node = viewGraph.nodes.find(n => n.id === centerId);
      if (node) {
        // give physics a tiny bit of time to settle before zooming
        setTimeout(() => {
            if (fgRef.current) {
                // Focus camera to node, with a reasonable zoom level for dense graphs
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(1.2, 1000);
            }
        }, 300);
      }
    }
  }, [centerId, viewGraph]);

  // Configure custom physics to spread nodes out nicely like the WEF map
  useEffect(() => {
    if (fgRef.current) {
        // High negative charge pushes nodes far apart to prevent overlap
        fgRef.current.d3Force('charge').strength(-300);
        // Increase base link distance
        fgRef.current.d3Force('link').distance(80);
    }
  }, []);

  // Pre-calculate connected links for hover effect
  const hoverLinks = useMemo(() => {
    if (!hoverNode) return new Set();
    const links = new Set();
    viewGraph.links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (srcId === hoverNode.id || tgtId === hoverNode.id) {
        links.add(l);
      }
    });
    return links;
  }, [hoverNode, viewGraph.links]);

  // Custom Node Drawing
  const drawNode = useCallback((node, ctx, globalScale) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isConnectedHover = hoverNode && hoverLinks.size > 0 && Array.from(hoverLinks).some(l => 
        (typeof l.source === 'object' ? l.source.id : l.source) === node.id || 
        (typeof l.target === 'object' ? l.target.id : l.target) === node.id
    );
    const dimOtherNodes = hoverNode && !isHovered && !isConnectedHover;

    let size = 3;
    let fillColor = 'transparent';
    let strokeColor = '#ffffff';
    let strokeWidth = 1;
    let isHollow = true;
    
    // View type coloring constraints
    if (node.viewType === 'center') {
        fillColor = '#806433'; // Deep gold/bronze
        strokeColor = '#d4af37'; // Bright gold rim
        size = 18; // Substantial but not overpowering center
        isHollow = false;
        strokeWidth = 2;
    } else if (node.viewType === 'history') {
        size = 6;
        strokeColor = '#a855f7'; // Purple rim for history node
        fillColor = 'transparent';
        strokeWidth = 2;
        isHollow = true;
    } else if (node.type === 'macro' || node.type === 'trend' || node.type === 'key_driver' || node.type === 'concept') {
        size = 4;
        strokeColor = '#ffffff';
        fillColor = 'transparent'; // WEF uses hollow rings for secondary nodes
        strokeWidth = 1.5;
        isHollow = true;
    } else { // satellites / issues
        size = 2;
        strokeColor = '#ffffff';
        strokeWidth = 1;
        isHollow = true;
    }

    if (dimOtherNodes) {
        if (node.viewType === 'history') {
            strokeColor = 'rgba(168, 85, 247, 0.4)'; // Keep history faintly visible
        } else {
            strokeColor = 'rgba(255, 255, 255, 0.1)';
            fillColor = isHollow ? 'transparent' : 'rgba(255, 255, 255, 0.1)';
        }
    } else if (isHovered || isConnectedHover) {
       ctx.shadowColor = node.viewType === 'history' ? '#c084fc' : '#60a5fa';
       ctx.shadowBlur = 15;
       if (node.viewType !== 'center') {
           strokeColor = node.viewType === 'history' ? '#c084fc' : '#60a5fa';
           if (!isHollow) fillColor = node.viewType === 'history' ? '#c084fc' : '#60a5fa';
       }
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    if (strokeWidth > 0) {
        ctx.lineWidth = strokeWidth / globalScale; // Keep stroke thin regardless of zoom
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
    }
    
    if (node.viewType === 'center') {
        // Draw an outer ring for the center
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)'; // Subtle gold halo
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
    } else if (node.viewType === 'history') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI, false);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)'; // Subtle purple halo
        ctx.lineWidth = 1 / globalScale;
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Label text
    if (!dimOtherNodes) {
        const label = node.label || node.id;
        const fontSize = Math.max(10 / globalScale, 3);
        ctx.font = `500 ${fontSize}px "Inter", sans-serif`;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (node.viewType === 'center') {
            // Write inside the central circle
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = 4;
            // Multiline logic could be added, but for now we'll just write it centered
            
            // If text is too long, we can try to split it, but a single line scaled is okay for now.
            ctx.fillText(label, node.x, node.y);
            ctx.shadowBlur = 0; // Reset
        } else {
            // Write above the node
            if (isHovered) {
                ctx.fillStyle = node.viewType === 'history' ? '#c084fc' : '#60a5fa';
            } else {
                ctx.fillStyle = node.viewType === 'history' ? '#e9d5ff' : '#e5e7eb';
            }
            ctx.fillText(label, node.x, node.y - size - (fontSize * 0.8));
        }
    }
  }, [hoverNode, hoverLinks]);

  // Custom Link Drawing
  const drawLink = useCallback((link, ctx) => {
    const isConnectedHover = hoverLinks.has(link);
    const dimOtherLinks = hoverNode && !isConnectedHover;

    const source = link.source;
    const target = link.target;
    
    // Ensure source and target objects exist with coordinates
    if (!source || !target || typeof source.x !== 'number' || typeof target.x !== 'number') return;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    let lineWidth = 0.5 / ctx.getTransform().a; // Extremely thin, relative to zoom
    let opacity = 0.25; // Subtle white lines

    if (link.isHistoryPointer) {
         ctx.setLineDash([2, 4]); // Dashed line for history
         lineWidth = 1 / ctx.getTransform().a;
         opacity = 0.3;
         ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
    } else {
        ctx.setLineDash([]); // Solid line
        if (isConnectedHover) {
            lineWidth = 1.2 / ctx.getTransform().a;
            opacity = 0.9;
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 4;
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
        } else if (dimOtherLinks) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        }
    }
    
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }, [hoverNode, hoverLinks]);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden cursor-move">
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={viewGraph}
        nodeLabel={() => ''} // disable default tooltip
        nodeCanvasObject={drawNode}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={drawLink}
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
