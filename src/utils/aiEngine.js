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
