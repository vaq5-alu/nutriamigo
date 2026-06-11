/**
 * http.js — Cliente HTTP compartido para toda la app.
 * Adjunta el ID Token de Firebase (verificado en el backend) y el UID.
 */
import { auth } from '../firebaseConfig';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const fetchWithAuth = async (endpoint, options = {}) => {
    const user = auth.currentUser;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (user) {
        headers['x-user-id'] = user.uid;
        try {
            // El SDK cachea el token y lo renueva solo cuando caduca
            headers['Authorization'] = `Bearer ${await user.getIdToken()}`;
        } catch (e) {
            console.warn('No se pudo obtener el token de Firebase:', e);
        }
    }

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch {
        throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
        let errorMessage = 'Error en el servidor';
        if (isJson) {
            const errorData = await response.json().catch(() => ({}));
            errorMessage = errorData.message || errorData.error || errorMessage;
        } else {
            errorMessage = await response.text().catch(() => errorMessage);
        }
        throw new Error(errorMessage);
    }

    return isJson ? response.json() : response.text();
};
