import { auth } from '../firebaseConfig';

const API_URL = 'http://localhost:3000/api';

const fetchWithAuth = async (endpoint, options = {}) => {
    const user = auth.currentUser;
    const headers = { 
        'Content-Type': 'application/json', 
        ...options.headers 
    };
    if (user) {
        headers['x-user-id'] = user.uid;
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) throw new Error('Error en el Chef IA');
    return response.json();
};

export const generateSmartMenu = async (profileData, checkinData, customInstruction = "") => {
    const data = await fetchWithAuth('/ai/menu', {
        method: 'POST',
        body: JSON.stringify({ profileData, checkinData, customInstruction })
    });
    return data.menu;
};

export const analyzeFoodImage = async (base64Image) => {
    const data = await fetchWithAuth('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({ base64Image })
    });
    return data.analysis;
};
