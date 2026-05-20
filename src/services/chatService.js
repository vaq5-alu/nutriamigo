import { auth } from '../firebaseConfig';

const API_URL = 'http://localhost:3000/api';

const fetchWithAuth = async (endpoint, options = {}) => {
    const user = auth.currentUser;
    const headers = { 
        'Content-Type': 'application/json', 
        ...options.headers 
    };
    if (user) {
        headers['x-user-id'] = user.uid; // Usamos el UID de Firebase
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Error en la API de IA');
    }
    return response.json();
};

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
            return {
                type: 'action',
                data: JSON.parse(jsonMatch[0]),
                text: visibleText.trim()
            };
        }
    }

    return { type: 'text', text: fullText };
};
