/**
 * api.js — Capa de persistencia HÍBRIDA.
 * Auth y Verification: Firebase.
 * Almacenamiento Dinámico: MySQL (backend Express).
 */

import {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    deleteUser,
    EmailAuthProvider,
    reauthenticateWithCredential
} from '../firebaseConfig';
import { API_URL, fetchWithAuth } from './http.js';

// ─── AUTH (Firebase + MySQL Sync) ─────────────────────────────────────────────

export const syncUserWithBackend = async (firebaseUser, username = "") => {
    const headers = { 'Content-Type': 'application/json' };
    try {
        headers['Authorization'] = `Bearer ${await firebaseUser.getIdToken()}`;
    } catch (e) {
        console.warn('Sync sin token:', e);
    }
    return fetch(`${API_URL}/auth/sync`, {
        method: 'POST',
        headers,
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

// Reemplaza la lista completa en una sola petición (transaccional en el backend)
export const replaceShoppingList = async (names) => fetchWithAuth('/shopping-list', {
    method: 'PUT',
    body: JSON.stringify({ items: names })
});

// ─── WEIGHT HISTORY (MySQL) ───────────────────────────────────────────────────

// Extrae "YYYY-MM-DD" de cualquier valor de fecha sin desfase UTC
const toLocalDateStr = (raw) => {
    if (!raw) return new Date().toLocaleDateString('sv');
    const d = raw instanceof Date ? raw : new Date(
        // Si es "YYYY-MM-DD" puro, parsear como mediodía local para evitar UTC shift
        typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))
            ? raw.slice(0, 10) + 'T12:00:00'
            : raw
    );
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getWeightHistory = async () => {
    const history = await fetchWithAuth('/weight-history');
    return history.map(h => ({
        ...h,
        // Siempre mediodía local para que getDate() devuelva el día correcto
        date: new Date(toLocalDateStr(h.date) + 'T12:00:00')
    }));
};

export const saveWeightEntry = async (date, weight) => {
    return fetchWithAuth('/weight-history', {
        method: 'POST',
        body: JSON.stringify({
            date: toLocalDateStr(date), // fecha local, nunca UTC
            weight
        })
    });
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

// ─── PREMIUM SYSTEM ──────────────────────────────────────────────────────────
export const subscribeToPremium = async () => fetchWithAuth('/premium/subscribe', { method: 'POST' });
export const cancelPremium = async () => fetchWithAuth('/premium/cancel', { method: 'POST' });
export const reactivatePremium = async () => fetchWithAuth('/premium/reactivate', { method: 'POST' });
export const getStreak = async () => fetchWithAuth('/streak');
