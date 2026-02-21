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
                // Focus camera to node, zoom 2.5
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(2.5, 1000);
            }
        }, 300);
      }
    }
  }, [centerId, viewGraph]);

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

    let size = 4;
    let color = '#ffffff'; // Outer node default
    
    // Size based on type mappings
    if (node.type === 'macro') size = 12;
    else if (node.type === 'trend') size = 8;
    else if (node.type === 'issue') size = 6;

    // View type coloring constraints
    if (node.viewType === 'center') {
        color = '#ef4444'; // Red for center
        size = Math.max(size, 14); // Boost center size
    } else if (node.viewType === 'inner') {
        color = '#3b82f6'; // Blue for immediate neighbors
    } else if (node.viewType === 'history') {
        color = '#8b5cf6'; // Violet for previous center
    }

    if (dimOtherNodes) {
        color = '#1f2937'; // Dimmed color
    } else if (isHovered || isConnectedHover) {
       // Add glowing effect
       ctx.shadowColor = color;
       ctx.shadowBlur = 10;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Label text
    if (!dimOtherNodes) {
        const label = node.label || node.id;
        const fontSize = Math.max(12 / globalScale, 4);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = `rgba(10, 15, 28, 0.8)`;
        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - size - bckgDimensions[1] - (isHovered ? 4 : 2), bckgDimensions[0], bckgDimensions[1]);
        
        ctx.fillStyle = isHovered ? '#60a5fa' : '#e5e7eb';
        ctx.fillText(label, node.x, node.y - size - bckgDimensions[1]/2 - (isHovered ? 4 : 2));
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

    let lineWidth = (link.strength || 1) * 0.5;
    let opacity = Math.min((link.strength || 1) * 0.1, 0.5);

    if (link.isHistoryPointer) {
         ctx.setLineDash([2, 4]); // Dashed line for history
         lineWidth = 1;
         opacity = 0.4;
         ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
    } else {
        ctx.setLineDash([]); // Solid line
        if (isConnectedHover) {
            lineWidth += 1;
            opacity = 0.9;
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 5;
            ctx.strokeStyle = `rgba(96, 165, 250, ${opacity})`;
        } else if (dimOtherLinks) {
            ctx.strokeStyle = 'rgba(31, 41, 55, 0.1)';
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
