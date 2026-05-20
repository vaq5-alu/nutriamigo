/**
 * api.js — Capa de persistencia HÍBRIDA.
 * Auth y Verification: Firebase.
 * Almacenamiento Dinámico: MySQL local.
 */

import {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    onAuthStateChanged,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential
} from '../firebaseConfig';

const API_URL = 'http://localhost:3000/api';

// Helper para peticiones con ID de Usuario como cabecera (Vinculado a Firebase UID)
const fetchWithAuth = async (endpoint, options = {}) => {
    const user = auth.currentUser;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (user) {
        headers['x-user-id'] = user.uid; // Usamos el UID como identificador único en MySQL
    }

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } catch (e) {
        throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
    }

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
        let errorMessage = 'Error en el servidor';
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } else {
            errorMessage = await response.text();
        }
        throw new Error(errorMessage);
    }

    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
};

// ─── AUTH (Firebase + MySQL Sync) ─────────────────────────────────────────────

export const syncUserWithBackend = async (firebaseUser, username = "") => {
    return fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: username || firebaseUser.displayName || firebaseUser.email.split('@')[0]
        })
    });
};

export const registerUser = async (username, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // 1. Enviar correo de verificación (Firebase)
    try { await sendEmailVerification(firebaseUser); } catch (e) { console.warn(e); }
    
    // 2. Sincronizar con el backend de MySQL
    await syncUserWithBackend(firebaseUser, username);
    
    return { id: firebaseUser.uid, username, email };
};

export const loginUser = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Sincronizar (por si es un login en una DB MySQL limpia)
    await syncUserWithBackend(firebaseUser);
    
    return { id: firebaseUser.uid, email: firebaseUser.email };
};

export const logoutUser = async () => {
    await signOut(auth);
};

export const checkVerificationStatus = async () => {
    if (auth.currentUser) {
        await auth.currentUser.reload();
        return auth.currentUser.emailVerified;
    }
    return false;
};

// ─── PROFILE (MySQL) ──────────────────────────────────────────────────────────

export const getProfile = async () => fetchWithAuth('/profile');

export const updateProfile = async (profileData) => {
    return fetchWithAuth('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
};

// ─── DAILY LOG (MySQL) ────────────────────────────────────────────────────────

export const getDailyLog = async (userId, dateStr) => {
    const logs = await fetchWithAuth(`/daily-log/${dateStr}`);
    return logs.map(l => ({ 
        ...l, 
        mealType: l.meal_type || 'snack', // Normalización de base de datos
        protein: l.protein || 0,
        carbs: l.carbs || 0,
        fat: l.fat || 0,
        createdAt: new Date(l.created_at) 
    }));
};
export const deleteLogEntry = async (id) => fetchWithAuth(`/daily-log/${id}`, { method: 'DELETE' });

export const deleteLogEntryByName = async (name, dateStr) => fetchWithAuth(`/daily-log/name/${encodeURIComponent(name)}?date=${dateStr}`, { method: 'DELETE' });

export const clearDailyLog = async (dateStr) => fetchWithAuth(`/daily-log/all?date=${dateStr}`, { method: 'DELETE' });

export const saveDailyLog = async (userId, dateStr, logs) => {
    // Las entradas se guardan individualmente. Esta función es para compatibilidad.
    return true; 
};

export const addLogEntry = async (entry, dateStr) => {
    return fetchWithAuth('/daily-log', {
        method: 'POST',
        body: JSON.stringify({ ...entry, date: dateStr })
    });
};

// ─── SHOPPING LIST (MySQL) ────────────────────────────────────────────────────

export const getShoppingList = async () => fetchWithAuth('/shopping-list');

export const addShoppingItem = async (name) => fetchWithAuth('/shopping-list', { method: 'POST', body: JSON.stringify({ name }) });

export const deleteShoppingItem = async (name) => fetchWithAuth('/shopping-list/item', { method: 'DELETE', body: JSON.stringify({ name }) });

export const clearShoppingList = async () => fetchWithAuth('/shopping-list', { method: 'DELETE' });

export const saveShoppingList = async (userId, listData) => {
    return true;
};

// ─── WEIGHT HISTORY (MySQL) ───────────────────────────────────────────────────

export const getWeightHistory = async () => {
    const history = await fetchWithAuth('/weight-history');
    return history.map(h => ({ ...h, date: new Date(h.date) }));
};

export const saveWeightHistory = async (userId, history) => {
    const last = history[history.length - 1];
    if (last) {
        await fetchWithAuth('/weight-history', {
            method: 'POST',
            body: JSON.stringify({
                date: last.date.toISOString().split('T')[0],
                weight: last.weight
            })
        });
    }
};

export const getTodayCheckin = async () => {
    return fetchWithAuth('/daily-checkin');
};

export const submitCheckin = async (data) => {
    return fetchWithAuth('/daily-checkin', {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

export const deleteUserAccount = async (password) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay un usuario activo.");

    // 1. Re-autenticar (Firebase requiere esto para borrar cuenta)
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // 2. Borrar datos en MySQL
    await fetchWithAuth('/auth/account', { method: 'DELETE' });

    // 3. Borrar usuario en Firebase
    await deleteUser(user);
};

export const getChatHistory = async () => [];
export const clearChatHistory = async () => {};

// ─── PREMIUM SYSTEM ──────────────────────────────────────────────────────────
export const subscribeToPremium = async () => fetchWithAuth('/premium/subscribe', { method: 'POST' });
export const cancelPremium = async () => fetchWithAuth('/premium/cancel', { method: 'POST' });
export const reactivatePremium = async () => fetchWithAuth('/premium/reactivate', { method: 'POST' });
export const getStreak = async () => fetchWithAuth('/streak');
