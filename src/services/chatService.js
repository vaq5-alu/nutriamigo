import { fetchWithAuth } from './http.js';

export const sendMessageToCoach = async (userMessage, context = {}) => {
    const data = await fetchWithAuth('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ userMessage, context })
    });

    const fullText = data.responseText;

    if (fullText.includes('---ACTIONS---')) {
        const [visibleText, actionsRaw] = fullText.split('---ACTIONS---');
        const jsonMatch = actionsRaw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                return {
                    type: 'action',
                    data: JSON.parse(jsonMatch[0]),
                    text: visibleText.trim()
                };
            } catch (e) {
                // JSON malformado de la IA: mostramos solo el texto visible
                console.warn('Acciones de la IA ilegibles:', e);
                return { type: 'text', text: visibleText.trim() };
            }
        }
    }

    return { type: 'text', text: fullText };
};
