// graphFilter.js

export const filterGraph = (globalGraph, centerId, previousCenterId = null) => {
    if (!globalGraph || !globalGraph.nodes || !globalGraph.links) return { nodes: [], links: [] };

    // Set of node IDs to include in the view
    const viewNodeIds = new Set();
    const centerNode = globalGraph.nodes.find(n => n.id === centerId);
    
    if (!centerNode) return { nodes: [], links: [] };

    viewNodeIds.add(centerId);

    // Get all links connected to the center node
    const immediateLinks = globalGraph.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return sourceId === centerId || targetId === centerId;
    });

    // Add immediate neighbors
    immediateLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        viewNodeIds.add(sourceId);
        viewNodeIds.add(targetId);
    });

    // Handle history breadcrumb if the previous center node wasn't included natively
    if (previousCenterId && !viewNodeIds.has(previousCenterId)) {
        viewNodeIds.add(previousCenterId);
        // Look for a link between the new center and the old center to display
        const historyLink = globalGraph.links.find(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return (sourceId === centerId && targetId === previousCenterId) || 
                   (sourceId === previousCenterId && targetId === centerId);
        });
        
        if (!historyLink) {
             // If there's no native link but we want to show history, add a dynamic one
             // Note: force-graph mutates link objects, so it's safer to clone the links structure anyway.
        }
    }

    // Now construct the view nodes and links
    const viewNodes = globalGraph.nodes.filter(n => viewNodeIds.has(n.id)).map(n => ({...n})); // Clone to avoid mutation
    
    // We want all links between ANY of our viewNodes (triangular dependencies)
    const viewLinks = globalGraph.links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return viewNodeIds.has(sourceId) && viewNodeIds.has(targetId);
    }).map(l => ({
        ...l, 
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target
    }));
    
    // Check if we need to polyfill a history link (if parent wasn't directly linked)
    if (previousCenterId) {
        const hasDirectLink = viewLinks.some(link => 
            (link.source === centerId && link.target === previousCenterId) ||
            (link.source === previousCenterId && link.target === centerId)
        );
        if (!hasDirectLink) {
            viewLinks.push({
                source: previousCenterId,
                target: centerId,
                relation: 'Previous Focus',
                strength: 1,
                isHistoryPointer: true // custom flag for styling
            });
        }
    }

    // Label neighbors
    viewNodes.forEach(node => {
        if (node.id === centerId) {
            node.viewType = 'center';
        } else if (node.id === previousCenterId) {
            node.viewType = 'history';  // Treat old center explicitly
        } else {
            // Check if it has a direct link with center
            const hasDirectLink = immediateLinks.some(link => {
                 const s = typeof link.source === 'object' ? link.source.id : link.source;
                 const t = typeof link.target === 'object' ? link.target.id : link.target;
                 return (s === node.id || t === node.id);
            });
            node.viewType = hasDirectLink ? 'inner' : 'outer';
        }
    });

    return {
        nodes: viewNodes,
        links: viewLinks
    };
};
