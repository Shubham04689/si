import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3-hierarchy';
import { zoom } from 'd3-zoom';
import { select } from 'd3-selection';
import { Sun, Moon } from 'lucide-react';

/**
 * Transforms a flat array of nodes and links into a D3-compatible hierarchy object.
 * Only traces outwards from the centerId (ignores cyclic/backward links to prevent infinite loops).
 */
const buildHierarchy = (nodes, links, rootId) => {
    const nodeMap = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));
    
    // We want a strict tree, so we need to track visited to prevent cycles
    const visited = new Set();
    
    const buildTree = (currentId) => {
        if (visited.has(currentId)) return null;
        visited.add(currentId);
        
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) return null;
        
        // Find outgoing links where source is currentId
        const childrenLinks = links.filter(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            return s === currentId;
        });
        
        const childrenIds = childrenLinks.map(l => typeof l.target === 'object' ? l.target.id : l.target);
        
        for (const childId of childrenIds) {
            const childNode = buildTree(childId);
            if (childNode) {
                currentNode.children.push(childNode);
            }
        }
        
        // D3 expects 'children' to be undefined if array is empty
        if (currentNode.children.length === 0) {
            delete currentNode.children;
        }
        
        return currentNode;
    };
    
    return buildTree(rootId);
};

export default function HistoryMindMap({ globalGraph, centerId, onNodeClick }) {
    const svgRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    
    // Auto-resize
    useEffect(() => {
        const updateDims = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight - 56 - 28 // Minus header/footer
            });
        };
        updateDims();
        window.addEventListener('resize', updateDims);
        return () => window.removeEventListener('resize', updateDims);
    }, []);

    // D3 Zoom and Pan
    useEffect(() => {
        if (!svgRef.current) return;
        
        const svg = select(svgRef.current);
        const zoomBehavior = zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (e) => {
                setTransform(e.transform);
                setIsDragging(true);
            })
            .on('end', () => {
                // Debounce drag end so a click isn't instantly triggered after panning
                setTimeout(() => setIsDragging(false), 50);
            });

        svg.call(zoomBehavior);
        svg.on("dblclick.zoom", null); // Prevent double-click zoom if desired
        
        return () => svg.on('.zoom', null);
    }, []);

    const layoutData = useMemo(() => {
        if (!globalGraph || !centerId) return null;
        
        const rootData = buildHierarchy(globalGraph.nodes, globalGraph.links, centerId);
        if (!rootData) return null;

        // Split children for bilateral layout (left / right)
        const leftChildren = [];
        const rightChildren = [];
        
        if (rootData.children) {
            rootData.children.forEach((child, idx) => {
                if (idx % 2 === 0) {
                    rightChildren.push(child);
                } else {
                    leftChildren.push(child);
                }
            });
        }
        
        // Create two separate d3 hierarchies
        const rootRight = d3.hierarchy({ ...rootData, children: rightChildren.length > 0 ? rightChildren : undefined });
        const rootLeft = d3.hierarchy({ ...rootData, children: leftChildren.length > 0 ? leftChildren : undefined });
        
        // Standardize spacing
        const dx = 60; // vertical spacing between nodes
        const dy = 250; // horizontal spacing between depths
        
        const tree = d3.tree().nodeSize([dx, dy]);
        
        const rightLayout = tree(rootRight);
        const leftLayout = tree(rootLeft);
        
        // For the left layout, we need to invert the y coordinates (d3 'y' is horizontal width)
        leftLayout.each(d => {
            d.y = -d.y;
        });
        
        // Combine nodes and links
        const rightNodes = rightLayout.descendants();
        const leftNodes = leftLayout.descendants().filter(d => d.depth !== 0); // Don't duplicate root
        
        const rightLinks = rightLayout.links();
        const leftLinks = leftLayout.links();
        
        const allNodes = [...rightNodes, ...leftNodes];
        const allLinks = [...rightLinks, ...leftLinks];
        
        // Find Inter-links (cross links) that aren't in the strict hierarchy
        const nodesById = new Map(allNodes.map(n => [n.data.id, n]));
        const crossLinks = [];
        
        globalGraph.links.forEach(l => {
            const sId = typeof l.source === 'object' ? l.source.id : l.source;
            const tId = typeof l.target === 'object' ? l.target.id : l.target;
            
            // Check if it's already a tree link
            const isTreeLink = allLinks.some(treeLink => 
                (treeLink.source.data.id === sId && treeLink.target.data.id === tId) ||
                (treeLink.source.data.id === tId && treeLink.target.data.id === sId)
            );
            
            if (!isTreeLink) {
                const sNode = nodesById.get(sId);
                const tNode = nodesById.get(tId);
                // Only draw cross-link if both nodes exist in the current hierarchy view
                if (sNode && tNode) {
                    crossLinks.push({ source: sNode, target: tNode });
                }
            }
        });
        
        // Center the view vertically
        let x0 = Infinity;
        let x1 = -x0;
        allNodes.forEach(d => {
            if (d.x > x1) x1 = d.x;
            if (d.x < x0) x0 = d.x;
        });

        return { nodes: allNodes, links: allLinks, crossLinks, x0, x1 };
    }, [globalGraph, centerId]);

    if (!layoutData) {
        return <div className="w-full h-full flex items-center justify-center text-gray-500 font-mono">Building Hierarchy...</div>;
    }

    const { nodes, links, crossLinks, x0, x1 } = layoutData;
    const viewHeight = Math.max(dimensions.height, x1 - x0 + 200);
    // Base center Y ignoring pan
    const centerY = -x0 + (viewHeight - (x1 - x0)) / 2;

    // A standard cubic bezier curve generator for horizontal layout
    const linkPath = (link) => {
        const s = link.source;
        const t = link.target;
        const midpointY = (s.y + t.y) / 2;
        return `M${s.y},${s.x}C${midpointY},${s.x} ${midpointY},${t.x} ${t.y},${t.x}`;
    };

    // Color definitions mimicking the reference style
    const COLORS = [
        '#E74C3C', // Red
        '#3498DB', // Blue
        '#9B59B6', // Purple
        '#1ABC9C', // Teal
        '#F1C40F', // Yellow
        '#F39C12'  // Orange
    ];

    const getStrokeColor = (d) => {
        // Child color based on index or type
        if (d.depth === 0) return '#E74C3C'; // Root is Red
        
        // To keep consistent colors per branch
        let ancestor = d;
        while (ancestor.depth > 1) {
            ancestor = ancestor.parent;
        }
        
        // Hash string to pick a color
        let hash = 0;
        for (let i = 0; i < ancestor.data.id.length; i++) {
            hash = ancestor.data.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return COLORS[Math.abs(hash) % COLORS.length];
    };

    const handleNodeClickInteraction = (e, nodeData) => {
        if (isDragging) return; // Ignore drag end clicks
        if (onNodeClick) onNodeClick(nodeData);
    };

    return (
        <div className={`w-full h-full overflow-hidden relative transition-colors duration-500 ${isDarkMode ? 'bg-[#0b101e]' : 'bg-[#fafbfc]'}`} style={{ 
            backgroundImage: isDarkMode ? 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)' : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px'
        }}>
            {/* Dark Mode Toggle */}
            <div className="absolute top-20 right-6 z-10">
                 <button 
                     onClick={() => setIsDarkMode(!isDarkMode)}
                     className={`p-2 rounded-full border backdrop-blur-md shadow-sm transition-all focus:outline-none ${isDarkMode ? 'bg-white/10 border-white/20 text-yellow-400 hover:bg-white/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                     title="Toggle Dark Mode"
                 >
                     {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                 </button>
            </div>

            <svg 
                ref={svgRef}
                width={dimensions.width} 
                height={dimensions.height}
                className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
            >
                {/* Apply zoom transform to global group */}
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
                    
                    {/* Shift everything to natural center, then apply zoom */}
                    <g transform={`translate(${dimensions.width/2}, ${centerY})`}>
                        
                        {/* Cross Links (Inter-links) rendered behind nodes and tree links */}
                        {crossLinks.map((link, i) => {
                            const pathData = linkPath(link);
                            return (
                                <path 
                                    key={`cross-${i}`}
                                    d={pathData}
                                    fill="none"
                                    stroke={isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                                    strokeWidth="1.5"
                                    strokeDasharray="5, 5"
                                    className="transition-all duration-500"
                                />
                            );
                        })}

                        {/* Tree Links */}
                    {links.map((link, i) => {
                        const pathData = linkPath(link);
                        const isLeft = link.target.y < 0;
                        const stroke = getStrokeColor(link.target);
                        
                        return (
                            <path 
                                key={`link-${i}`}
                                d={pathData}
                                fill="none"
                                stroke={stroke}
                                strokeWidth={link.source.depth === 0 ? "3" : "2"}
                                strokeOpacity={0.8}
                                className="transition-all duration-500"
                            />
                        );
                    })}

                        // Nodes
                        {nodes.map(d => {
                            const isRoot = d.depth === 0;
                            const isLeft = d.y < 0;
                            const rectWidth = isRoot ? 120 : 160;
                            const rectHeight = isRoot ? 120 : 36;
                            
                            const strokeColor = getStrokeColor(d);

                            return (
                                <g 
                                    key={d.data.id} 
                                    transform={`translate(${d.y}, ${d.x})`}
                                    onClick={(e) => handleNodeClickInteraction(e, d.data)}
                                    className="cursor-pointer group"
                                >
                                    {isRoot ? (
                                        // Circular Root Node
                                        <>
                                            <circle 
                                                r="65" 
                                                fill={isDarkMode ? '#1e293b' : '#ecf0f1'} 
                                                stroke={isDarkMode ? '#334155' : '#bdc3c7'}
                                                strokeWidth="1"
                                                className="transition-colors duration-500"
                                            />
                                        <circle 
                                            r="55" 
                                            fill="#ff6b6b" 
                                            stroke="#ffffff"
                                            strokeWidth="4"
                                            className="group-hover:fill-[#ff5252] transition-colors"
                                        />
                                        <text
                                            dy="0.3em"
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="14"
                                            fontWeight="600"
                                            fontFamily="sans-serif"
                                            className="pointer-events-none select-none"
                                        >
                                            {d.data.label.toUpperCase()}
                                        </text>
                                    </>
                                ) : (
                                    // Rectangular Child Nodes
                                        <>
                                            {/* Connector Dot */}
                                            <circle 
                                                cx={isLeft ? rectWidth/2 + 10 : -rectWidth/2 - 10} 
                                                cy="0" 
                                                r="6" 
                                                fill={isDarkMode ? '#94a3b8' : '#2c3e50'}
                                                className="transition-colors duration-500"
                                            />
                                            
                                            {/* Colored Rectangle */}
                                            <rect 
                                                x={-rectWidth/2} 
                                                y={-rectHeight/2} 
                                                width={rectWidth} 
                                                height={rectHeight} 
                                                rx="18" // Pill shape
                                                fill={strokeColor}
                                                className="group-hover:brightness-110 transition-all drop-shadow-sm"
                                            />
                                        
                                        {/* Outer small icon circle indicator (Left or Right aligned depending on pos) */}
                                        <circle 
                                            cx={isLeft ? rectWidth/2 : -rectWidth/2}
                                            cy="0"
                                            r="14"
                                            fill="#f1c40f"
                                            stroke="white"
                                            strokeWidth="2"
                                            className="drop-shadow-sm"
                                        />
                                        
                                        {/* Optional text indicator on the node relative to side */}
                                        <text
                                            dy="0.32em"
                                            x={isLeft ? -5 : 5}
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="12"
                                            fontWeight="500"
                                            fontFamily="sans-serif"
                                            className="pointer-events-none drop-shadow-sm truncate"
                                        >
                                            {d.data.label.length > 20 ? d.data.label.substring(0,18)+'...' : d.data.label}
                                        </text>
                                    </>
                                )}
                                </g>
                            );
                        })}
                    </g>
                </g>
            </svg>
        </div>
    );
}
