// SchemaValidator.js

export const validateMapData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON format');
  }

  // Check meta
  if (!data.meta || !data.meta.title || !data.meta.version) {
    throw new Error('Missing required schema fields: meta.title or meta.version');
  }

  // Check nodes
  if (!Array.isArray(data.nodes)) {
    throw new Error('Schema must contain a "nodes" array');
  }

  const nodeIds = new Set();
  data.nodes.forEach((node, index) => {
    if (!node.id || !node.label || !node.type) {
      throw new Error(`Node at index ${index} is missing required fields (id, label, type)`);
    }
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node ID found: ${node.id}`);
    }
    nodeIds.add(node.id);
    
    // Validate content structure
    if (!node.content || typeof node.content.summary !== 'string') {
        throw new Error(`Node ${node.id} is missing required content summary`);
    }
  });

  // Check links
  if (!Array.isArray(data.links)) {
    throw new Error('Schema must contain a "links" array');
  }

  data.links.forEach((link, index) => {
    if (!link.source || !link.target) {
      throw new Error(`Link at index ${index} is missing source or target`);
    }
    // Strict schema check: ensure links point to valid nodes
    if (!nodeIds.has(link.source)) {
      throw new Error(`Link source "${link.source}" does not exist in nodes`);
    }
    if (!nodeIds.has(link.target)) {
      throw new Error(`Link target "${link.target}" does not exist in nodes`);
    }
  });

  return true;
};
