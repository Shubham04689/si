// src/utils/aiEngine.js

/**
 * Standardized utility for calling the configured AI provider.
 * Extracts settings from localStorage automatically.
 */
export async function generateCompletion(systemPrompt, userPrompt, temperature = 0.7) {
    const endpoint = localStorage.getItem('ai_endpoint') || 'http://localhost:11434/v1';
    const apiKey = localStorage.getItem('ai_api_key') || '';
    const model = localStorage.getItem('ai_model') || 'llama3';

    const baseUrl = endpoint.replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: temperature,
            stream: false
        })
    });

    if (!res.ok) {
        throw new Error(`AI API Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

/**
 * Standardized utility for extracting structured JSON from the AI.
 * Appends JSON instructions and attempts to parse the payload safely.
 */
export async function generateJSONCompletion(systemPrompt, userPrompt, temperature = 0.5) {
    const jsonPrompt = systemPrompt + `\n\nCRITICAL: You must return ONLY valid JSON. No markdown backticks, no markdown blocks, no conversational text. Start directly with { and end with }. Do not wrap in \`\`\`json.`;
    
    // We can use response_format if testing against models that support it, but for broader compatibility with Ollama (some models ignore it), the prompt injunction is safest.
    const resText = await generateCompletion(jsonPrompt, userPrompt, temperature);
    
    try {
        // Basic cleanup just in case the model ignored instructions and wrapped it in markdown
        let cleaned = resText.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.substring(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3);
        
        return JSON.parse(cleaned.trim());
    } catch (err) {
        console.error("Failed to parse AI JSON:", err, "Raw Output:", resText);
        throw new Error("AI did not return a valid JSON object.");
    }
}

/**
 * Analyzes an active node against a pool of unconnected nodes to find contextual correlations.
 * Returns an array of node IDs that are most logically related.
 */
export async function suggestConnections(activeNode, availableNodes) {
    if (!availableNodes || availableNodes.length === 0) return [];
    
    const systemPrompt = `You are a strategic intelligence graphing engine. Your goal is to identify hidden correlations and logical connections between disparate concepts.
Given an Active Topic and a list of Available Topics, return the IDs of the 3 to 4 most logically, structurally, or contextually related Available Topics.

CRITICAL: Return ONLY a valid JSON array of string IDs. Do not return objects, do not return explanations.
Example output: ["node-id-1", "node-id-2", "node-id-3"]`;

    const availableContext = availableNodes.map(n => 
        `ID: ${n.id} | Topic: ${n.label} | Summary: ${n.content?.summary || 'No summary available'}`
    ).join('\n');

    const userPrompt = `ACTIVE TOPIC:
Label: ${activeNode.label}
Summary: ${activeNode.content?.summary || 'No summary available'}

AVAILABLE TOPICS TO CONNECT:
${availableContext}`;

    try {
        const result = await generateJSONCompletion(systemPrompt, userPrompt, 0.4);
        if (Array.isArray(result)) {
            return result;
        }
        console.warn("AI did not return an array for suggestions:", result);
        return [];
    } catch (err) {
        console.error("Failed to generate contextual suggestions:", err);
        throw err;
    }
}
