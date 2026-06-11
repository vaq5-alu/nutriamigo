import { fetchWithAuth } from './http.js';

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
