import { useState, useEffect, useRef } from 'react';
import NavButton from './components/NavButton.jsx';
import Layout from './components/Layout.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import DashboardScreen from './components/DashboardScreen.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import ShoppingListScreen from './components/ShoppingListScreen.jsx';
import MenuGeneratorScreen from './components/MenuGeneratorScreen.jsx';
import DailyLogScreen from './components/DailyLogScreen.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import ProgressScreen from './components/ProgressScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import { ToastContainer, ToastStyles } from './components/Toast.jsx';
import PremiumScreen from './components/PremiumScreen.jsx';

import { recipes } from './data/recipeDatabase.js';

import VerificationPendingScreen from './components/VerificationPendingScreen.jsx';
import { loginUser, registerUser, getTodayCheckin, getProfile, updateProfile, logoutUser, checkVerificationStatus, getDailyLog, addLogEntry, deleteLogEntry, deleteLogEntryByName, clearDailyLog, getShoppingList, replaceShoppingList, getWeightHistory, saveWeightEntry, deleteUserAccount, syncUserWithBackend, subscribeToPremium, cancelPremium, reactivatePremium, getStreak } from './services/api.js';
import { auth, onAuthStateChanged, sendPasswordResetEmail } from './firebaseConfig';

const APP_NAME = "NutrIAmigo";

// Devuelve "YYYY-MM-DD" en hora local sin desfase UTC
const localDateStr = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const MEAL_TYPE_MAP = {
  'breakfast': 'desayuno',
  'lunch': 'comida',
  'dinner': 'cena',
  'snack': 'snack',
  'desayuno': 'desayuno',
  'comida': 'comida',
  'almuerzo': 'comida',
  'cena': 'cena'
};

const normalizeMealType = (mealType) => {
  const key = mealType ? mealType.toLowerCase() : 'snack';
  return MEAL_TYPE_MAP[key] || key;
};

const CANONICAL_INGREDIENTS = [
  { keywords: ['avena', 'copos de avena'], canonical: 'Avena', defaultUnit: 'g' },
  { keywords: ['leche de almendra', 'leche de almendras'], canonical: 'Leche de Almendras', defaultUnit: 'ml' },
  { keywords: ['leche desnatada'], canonical: 'Leche Desnatada', defaultUnit: 'ml' },
  { keywords: ['leche de coco', 'leche coco'], canonical: 'Leche de Coco', defaultUnit: 'ml' },
  { keywords: ['leche'], canonical: 'Leche', defaultUnit: 'ml' },
  { keywords: ['yogur griego', 'yogurt griego'], canonical: 'Yogur Griego', defaultUnit: 'g' },
  { keywords: ['plátano', 'platano', 'banana'], canonical: 'Plátano', defaultUnit: 'unidad' },
  { keywords: ['manzana'], canonical: 'Manzana', defaultUnit: 'unidad' },
  { keywords: ['nueces', 'nuez'], canonical: 'Nueces', defaultUnit: 'g' },
  { keywords: ['almendra', 'almendras'], canonical: 'Almendras', defaultUnit: 'g' },
  { keywords: ['chía', 'chia'], canonical: 'Semillas de Chía', defaultUnit: 'g' },
  { keywords: ['proteína', 'proteina', 'scoop', 'whey'], canonical: 'Proteína en Polvo', defaultUnit: 'g' },
  { keywords: ['salmón', 'salmon'], canonical: 'Salmón', defaultUnit: 'g' },
  { keywords: ['pollo', 'pechuga de pollo'], canonical: 'Pechuga de Pollo', defaultUnit: 'g' },
  { keywords: ['pavo', 'pechuga de pavo'], canonical: 'Pechuga de Pavo', defaultUnit: 'g' },
  { keywords: ['quinoa'], canonical: 'Quinoa', defaultUnit: 'g' },
  { keywords: ['brócoli', 'brocoli'], canonical: 'Brócoli', defaultUnit: 'g' },
  { keywords: ['espárrago', 'esparrago', 'espárragos', 'esparragos'], canonical: 'Espárragos', defaultUnit: 'g' },
  { keywords: ['fruto rojo', 'frutos rojos', 'arándanos', 'arandanos', 'fresas'], canonical: 'Frutos Rojos', defaultUnit: 'g' },
  { keywords: ['pimiento'], canonical: 'Pimiento Rojo', defaultUnit: 'g' },
  { keywords: ['zanahoria'], canonical: 'Zanahoria', defaultUnit: 'g' },
  { keywords: ['calabacín', 'calabacin'], canonical: 'Calabacín', defaultUnit: 'g' },
  { keywords: ['batata', 'boniato', 'camote'], canonical: 'Batata (Boniato)', defaultUnit: 'g' },
  { keywords: ['canela'], canonical: 'Canela', defaultUnit: 'g' },
  { keywords: ['aceite de oliva', 'aceite'], canonical: 'Aceite de Oliva', defaultUnit: 'ml' },
  { keywords: ['limón', 'limon'], canonical: 'Limón', defaultUnit: 'unidad' },
  { keywords: ['hierba', 'hierbas', 'romero', 'orégano', 'oregano', 'tomillo'], canonical: 'Hierbas Aromáticas', defaultUnit: 'g' },
  { keywords: ['sal y pimienta', 'sal, pimienta', 'pimienta', 'sal'], canonical: 'Sal y Pimienta', defaultUnit: 'al gusto' },
  { keywords: ['huevo', 'huevos'], canonical: 'Huevos', defaultUnit: 'unidad' },
  { keywords: ['queso'], canonical: 'Queso', defaultUnit: 'g' }
];

const parseAndNormalizeIngredient = (rawStr) => {
  const cleanStr = rawStr.trim().toLowerCase();
  
  let canon = null;
  for (const item of CANONICAL_INGREDIENTS) {
    if (item.keywords.some(keyword => cleanStr.includes(keyword))) {
      canon = item;
      break;
    }
  }
  
  let name = rawStr;
  let qty = 1;
  let unit = '';
  
  if (canon) {
    name = canon.canonical;
  }
  
  if (cleanStr.includes('pizca') || cleanStr.includes('una pizca')) {
    qty = 1;
    unit = (canon && canon.defaultUnit === 'g') ? 'g' : 'pizca';
  } else if (cleanStr.includes('medio') || cleanStr.includes('media') || cleanStr.includes('1/2')) {
    qty = 0.5;
    unit = canon ? canon.defaultUnit : 'unidad';
  } else if (cleanStr.includes('un toque') || cleanStr.includes('toque')) {
    qty = 0.2;
    unit = 'unidad';
  } else if (cleanStr.includes('al gusto')) {
    qty = 1;
    unit = 'al gusto';
  } else {
    const numRegex = /([\d.,/]+)\s*(g|ml|cda|cdta|cucharada|cucharadita|scoop|vaso|taza|unidad|unidades|rebanada|rebanadas)?/i;
    const match = cleanStr.match(numRegex);
    
    if (match) {
      let rawQty = match[1];
      let rawUnit = match[2] || '';
      
      if (rawQty.includes('/')) {
        const [n, d] = rawQty.split('/');
        qty = parseFloat(n) / parseFloat(d) || 1;
      } else {
        qty = parseFloat(rawQty.replace(',', '.')) || 1;
      }
      
      unit = rawUnit ? rawUnit : (canon ? canon.defaultUnit : 'unidad');
      
      const parenMatch = cleanStr.match(/\((\d+)\s*(g|ml)\)/);
      if (parenMatch) {
        const parenQty = parseFloat(parenMatch[1]);
        const parenUnit = parenMatch[2].toLowerCase();
        
        if (unit !== parenUnit) {
          qty = parenQty * qty;
          unit = parenUnit;
        }
      }
      
      if (unit) {
        unit = unit.toLowerCase();
        if (unit.startsWith('g')) {
          unit = 'g';
        } else if (unit.startsWith('ml')) {
          unit = 'ml';
        } else if (unit === 'cda' || unit.startsWith('cucharada')) {
          qty = qty * 15;
          unit = (canon && canon.defaultUnit === 'ml') ? 'ml' : 'g';
        } else if (unit === 'cdta' || unit.startsWith('cucharadita')) {
          qty = qty * 5;
          unit = (canon && canon.defaultUnit === 'ml') ? 'ml' : 'g';
        } else if (unit.startsWith('rebanada')) {
          unit = 'rebanada';
        } else if (unit.startsWith('scoop')) {
          qty = qty * 30;
          unit = 'g';
        } else if (unit.startsWith('vaso') || unit.startsWith('taza')) {
          qty = qty * 200;
          unit = (canon && canon.defaultUnit === 'ml') ? 'ml' : 'g';
        }
      }
    } else {
      qty = null;
      unit = '';
    }
  }
  
  if (!canon) {
    let nameClean = rawStr.replace(/^[\d.,/\s]*(g|ml|cda|cdta|cucharada|cucharadita|scoop|vaso|taza|unidad|unidades|rebanada|rebanadas)?(\s+de\s+|\s+)?/i, '');
    nameClean = nameClean.replace(/\(.*?\)/g, '');
    nameClean = nameClean.replace(/al gusto/g, '');
    nameClean = nameClean.trim();
    name = nameClean.charAt(0).toUpperCase() + nameClean.slice(1);
    unit = unit || '';
  }
  
  return { name, qty, unit };
};

const formatIngredientDisplay = (name, qty, unit) => {
  // Sin cantidad real (null, 0, NaN): mostrar solo el nombre, nunca "(x0)"
  if (!qty || isNaN(qty)) {
    return unit === 'al gusto' ? `${name} (al gusto)` : name;
  }
  if (unit === 'al gusto') {
    return `${name} (al gusto)`;
  }
  
  let displayQty = qty;
  let displayUnit = unit;
  
  if (unit === 'g' && qty >= 1000) {
    displayQty = qty / 1000;
    displayUnit = 'kg';
  } else if (unit === 'ml' && qty >= 1000) {
    displayQty = qty / 1000;
    displayUnit = 'L';
  }
  
  const formattedQty = Number.isInteger(displayQty) ? displayQty : parseFloat(displayQty.toFixed(2));
  
  if (displayUnit === 'unidad' || displayUnit === 'unidades') {
    return `${name} (${formattedQty} ${formattedQty === 1 ? 'unidad' : 'unidades'})`;
  }
  if (!displayUnit) {
    return `${name} (x${formattedQty})`;
  }
  // Unidades "palabra" (pizca, rebanada...) llevan espacio: "(1 pizca)", no "(1pizca)"
  if (displayUnit.length > 2) {
    return `${name} (${formattedQty} ${displayUnit})`;
  }
  return `${name} (${formattedQty}${displayUnit})`;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [user, setUser] = useState(null); // { id, username, email }
  const [todayCheckin, setTodayCheckin] = useState(null);

  const currentXPRef = useRef(0);
  useEffect(() => {
    if (profileData) {
      currentXPRef.current = profileData.xp || 0;
    }
  }, [profileData]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isPremium, setIsPremium] = useState(null); // null = loading, true/false = determined
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [streak, setStreak] = useState(0);
  const [shoppingList, setShoppingList] = useState([]);
  const [dailyLog, setDailyLog] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('nutricoach_chat');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('nutricoach_chat', JSON.stringify(chatMessages));
    } else {
      // Evita que el chat de un usuario persista para el siguiente tras cerrar sesión
      localStorage.removeItem('nutricoach_chat');
    }
  }, [chatMessages]);

  // State: Notifications
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message }]);

    // Auto remove after 4s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 1. Manejo de Autenticación Híbrida (Firebase Auth -> MySQL Sync)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          isVerified: firebaseUser.emailVerified
        };
        setUser(userData);

        const initUser = async () => {
          // Asegurar sincronización con MySQL
          try { await syncUserWithBackend(firebaseUser); } catch (e) { console.error("Sync error:", e); }

          // Cargar Perfil desde MySQL
          try {
            const profile = await getProfile();
            if (profile) {
              setProfileData(profile);
              setIsPremium(!!profile.is_premium);
              setPremiumUntil(profile.premium_until);
            }
          } catch (e) {
            console.error("Error loading profile from MySQL:", e);
          }

          // Cargar Checkin
          try {
            const checkin = await getTodayCheckin();
            if (checkin) setTodayCheckin(checkin);
          } catch (e) { console.error(e); }
          
          setIsLoading(false);
        };
        initUser();
      } else {
        setUser(null);
        setProfileData(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Data Persistence Syncer ---

  const checkProfileCompleteness = (p) => {
    if (!p) return false;
    const required = ['age', 'gender', 'height', 'current_weight', 'target_weight', 'goal'];
    return required.every(field => p[field] && p[field] !== '');
  };

  const isProfileComplete = checkProfileCompleteness(profileData);

  useEffect(() => {
    // Si el usuario está logueado pero el perfil está incompleto, forzar vista de perfil
    if (user && !isLoading && !isProfileComplete && currentView !== 'profile') {
      setCurrentView('profile');
    }
  }, [user, isLoading, isProfileComplete, currentView]);

  // 1. Load Data on User Auth
  // 1. Load Data on User Auth OR Date Change
  useEffect(() => {
    if (!user) {
      setDailyLog([]);
      setShoppingList([]);
      setWeightHistory([]);
      return;
    }

    const fetchStreak = async () => {
      try {
        const streakData = await getStreak();
        setStreak(streakData?.streak || 0);
      } catch (streakErr) {
        console.error("Error fetching streak:", streakErr);
      }
    };

    const loadUserData = async () => {
      try {

        setDailyLog([]);
        setWeightHistory([]);

        const dateStr = localDateStr(selectedDate);

        // Diario, historial de peso y racha en paralelo (antes era secuencial)
        const [logs, history] = await Promise.all([
          getDailyLog(user.id, dateStr),
          getWeightHistory(),
          fetchStreak()
        ]);
        setDailyLog(logs);
        setWeightHistory(history);

      } catch (e) {
        console.error("Error loading user data:", e);
        addNotification('error', 'Error cargando datos del diario.');
      }
    };

    loadUserData();
  }, [user, selectedDate]);

  // 1b. Load Shopping List (Only on Login)
  useEffect(() => {
    if (!user) return;
    const loadShoppingList = async () => {
      try {
        const list = await getShoppingList(user.id);
        setShoppingList(list);
      } catch (e) {
        console.error("Error loading shopping list:", e);
      }
    };
    loadShoppingList();
  }, [user]);

  const handleCheckinCompleted = async (data) => {
    setTodayCheckin(data);
    try {
      const streakData = await getStreak();
      setStreak(streakData?.streak || 0);
    } catch (e) { console.error("Error updating streak after checkin:", e); }
  };

  // --- Funciones de Autenticación ---
  const handleRegister = async (username, email, password) => {
    try {
      setIsLoading(true);
      await registerUser(username, email, password);
      addNotification('success', '¡Cuenta creada! Revisa tu email para verificarla 📧');
    } catch (error) {
      console.error("Register Error:", error);
      let msg = error.message;
      if (msg.includes('auth/email-already-in-use')) msg = "Este correo ya está registrado. Prueba a entrar.";
      alert("⚠️ " + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      setIsLoading(true);
      await loginUser(email, password);
    } catch (error) {
      console.error("Login Error:", error);
      let msg = error.message;
      // Normalizar errores de Firebase para el usuario
      if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
        msg = "No existe ninguna cuenta con este correo o la contraseña es incorrecta.";
      } else if (msg.includes('auth/wrong-password')) {
        msg = "Contraseña incorrecta.";
      } else if (msg.includes('auth/invalid-email')) {
        msg = "El formato del correo no es válido.";
      }
      alert("⚠️ " + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    try {
      if (!email) throw new Error("Por favor, introduce tu correo electrónico.");
      await sendPasswordResetEmail(auth, email);
      alert("✅ Si el correo está registrado, recibirás un enlace de recuperación. Revisa tu carpeta de SPAM.");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleLogout = () => {
    logoutUser(); // Firebase logout
    setUser(null);
    setProfileData(null);
    setShoppingList([]);
    setDailyLog([]);
    setWeightHistory([]);
    setChatMessages([]);
    localStorage.removeItem('nutricoach_user');
    setCurrentView('dashboard');
  };

  const handleDeleteAccount = async (password) => {
    try {
      await deleteUserAccount(password);
      setUser(null);
      setProfileData(null);
      setShoppingList([]);
      setDailyLog([]);
      setWeightHistory([]);
      setChatMessages([]);
      localStorage.removeItem('nutricoach_user');
      setCurrentView('dashboard');
      alert("Tu cuenta y todos tus datos han sido borrados permanentemente.");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };


  // Única vía de modificación de la lista de la compra. Parte SIEMPRE del
  // estado más reciente (ref síncrona): si el chat encadena varias acciones
  // seguidas (ej. borrar peras y manzanas), cada una ve el resultado de la
  // anterior en vez de calcular sobre una copia antigua y pisarse entre sí.
  const shoppingListRef = useRef([]);
  useEffect(() => { shoppingListRef.current = shoppingList; }, [shoppingList]);

  const mutateShoppingList = async (updater) => {
    const next = updater(shoppingListRef.current);
    shoppingListRef.current = next;
    setShoppingList(next);
    await replaceShoppingList(next.map(item => item.name));
  };

  // Fusiona un ingrediente en una lista. Mismo nombre → misma línea:
  // si ambas tienen cantidad comparable se suman; si alguna no tiene
  // cantidad real ("al gusto", "una pizca", sin número) no se duplica,
  // se conserva la versión más informativa.
  const mergeIngredientIntoList = (list, ingredientStr) => {
    const parsedNew = parseAndNormalizeIngredient(ingredientStr);
    const hasQty = (p) => !!p.qty && !isNaN(p.qty) && p.unit && p.unit !== 'al gusto';
    let found = false;

    const updatedList = list.map(item => {
      if (found) return item;
      const parsedExisting = parseAndNormalizeIngredient(item.name);
      if (parsedExisting.name.toLowerCase() !== parsedNew.name.toLowerCase()) return item;

      // Cantidades comparables (misma unidad): sumar
      if (hasQty(parsedExisting) && hasQty(parsedNew) && parsedExisting.unit === parsedNew.unit) {
        found = true;
        const totalQty = parsedExisting.qty + parsedNew.qty;
        return { ...item, name: formatIngredientDisplay(parsedExisting.name, totalQty, parsedExisting.unit) };
      }

      // Alguna de las dos sin cantidad real: misma línea, sin duplicar.
      // Si la nueva aporta cantidad y la existente no, nos quedamos con la nueva.
      if (!hasQty(parsedExisting) || !hasQty(parsedNew)) {
        found = true;
        if (!hasQty(parsedExisting) && hasQty(parsedNew)) {
          return { ...item, name: formatIngredientDisplay(parsedNew.name, parsedNew.qty, parsedNew.unit) };
        }
        return item;
      }

      // Mismo nombre pero unidades distintas y ambas con cantidad (g vs ml): dejar separadas
      return item;
    });

    if (!found) {
      const newStr = formatIngredientDisplay(parsedNew.name, parsedNew.qty, parsedNew.unit);
      updatedList.push({ id: Date.now() + Math.random(), name: newStr });
    }
    return updatedList;
  };

  const handleAddShoppingItem = async (itemName) => {
    try {
      await mutateShoppingList(list => mergeIngredientIntoList(list, itemName));
      handleAddXP(5);
    } catch (e) {
      console.error('Error al guardar item:', e);
      addNotification('error', 'Error al guardar en la lista de la compra ❌');
    }
  };

  const handleDeleteShoppingItem = async (itemId) => {
    try {
      await mutateShoppingList(list => list.filter(item => item.id !== itemId));
    } catch (e) {
      console.error('Error deleting item:', e);
    }
  };

  const handleDeleteShoppingItemByName = async (itemName) => {
    try {
      await mutateShoppingList(list => list.filter(item => !item.name.toLowerCase().includes(itemName.toLowerCase())));
    } catch (e) { console.error('Error deleting item by name:', e); }
  };

  const handleClearShoppingList = async () => {
    try {
      await mutateShoppingList(() => []);
      addNotification('success', `Lista de la compra vaciada 🧹`);
    } catch (e) { console.error('Error clearing shopping list:', e); }
  };

  const handleCancelPremium = async () => {
    console.log('[PREMIUM] Iniciando cancelación...');
    if (!window.confirm("¿Estás seguro de que quieres cancelar la renovación automática?")) return;
    try {
      const res = await cancelPremium();
      console.log('[PREMIUM] Respuesta cancel:', res);
      const updatedProfile = await getProfile();
      console.log('[PREMIUM] Perfil actualizado:', updatedProfile);
      setProfileData(updatedProfile);
      setIsPremium(!!updatedProfile.is_premium);
      setPremiumUntil(updatedProfile.premium_until);
      addNotification('success', 'Renovación desactivada 📅');
      alert('Se ha desactivado la renovación automática con éxito.');
    } catch (e) {
      console.error('Error canceling premium:', e);
      addNotification('error', 'No se pudo cancelar la suscripción.');
    }
  };

  const handleReactivatePremium = async () => {
    console.log('[PREMIUM] Iniciando reactivación...');
    try {
      const res = await reactivatePremium();
      console.log('[PREMIUM] Respuesta reactivate:', res);
      const updatedProfile = await getProfile();
      setProfileData(updatedProfile);
      setIsPremium(!!updatedProfile.is_premium);
      setPremiumUntil(updatedProfile.premium_until);
      addNotification('success', '¡Renovación reactivada! ⭐');
      alert('¡Suscripción reactivada correctamente!');
    } catch (e) {
      console.error('Error reactivating premium:', e);
      addNotification('error', 'No se pudo reactivar la suscripción.');
    }
  };

  const handleAddRecipeToLog = async (recipe, mealType, skipNotification = false) => {
    const normalizedMealType = normalizeMealType(mealType);

    const newEntry = {
      id: Date.now() + Math.random(),
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      mealType: normalizedMealType,
      createdAt: new Date(),
      recipeId: recipe.id
    };

    const dateStr = localDateStr(selectedDate);
    try {
      await addLogEntry(newEntry, dateStr);
      // 2. Update local state
      setDailyLog(prevLogs => [newEntry, ...prevLogs]);
      handleAddXP(10);
      if (!skipNotification) {
        addNotification('success', `Añadido al diario: ${recipe.name} 📅`);
      }
    } catch (e) {
      console.error('Error al guardar receta:', e);
      addNotification('error', 'Error al guardar en el diario ❌');
    }
  };

  const handleDeleteLogEntry = async (entryId) => {
    setDailyLog(dailyLog.filter(entry => entry.id !== entryId));
    try {
      await deleteLogEntry(entryId);
    } catch (e) { console.error('Error deleting log entry:', e); }
  };

  const handleAddIngredientsToShoppingList = async (recipeOrIdOrList, skipNotification = false) => {
    let recipesToProcess = [];
    
    if (Array.isArray(recipeOrIdOrList)) {
      recipesToProcess = recipeOrIdOrList;
    } else {
      let recipe = recipeOrIdOrList;
      if (typeof recipeOrIdOrList === 'number' || typeof recipeOrIdOrList === 'string') {
        recipe = recipes.find(r => r.id === recipeOrIdOrList);
      }
      if (recipe) {
        recipesToProcess = [recipe];
      }
    }

    if (recipesToProcess.length === 0) return;

    const allItemsToAdd = [];
    recipesToProcess.forEach(recipe => {
      const items = recipe.shoppingList || recipe.ingredients || [];
      items.forEach(item => {
        let ingredientStr = item;
        if (typeof item === 'object' && item.name) {
          ingredientStr = `${item.name} (${item.amount})`;
        }
        allItemsToAdd.push(ingredientStr);
      });
    });

    if (allItemsToAdd.length === 0) return;

    try {
      await mutateShoppingList(list =>
        allItemsToAdd.reduce((acc, ingredientStr) => mergeIngredientIntoList(acc, ingredientStr), list)
      );
      if (!skipNotification) {
        addNotification('success', `Ingredientes añadidos y organizados 🛒`);
      }
    } catch (e) {
      console.error('Error persisting ingredients:', e);
    }
  };

  const handleAddScannedFood = async (product) => {
    const newEntry = {
      id: Date.now(),
      name: `${product.name} (${product.weight}g)`,
      calories: product.calories || 0,
      protein: product.protein || 0,
      carbs: product.carbs || 0,
      fat: product.fat || 0,
      mealType: normalizeMealType(product.mealType),
      createdAt: new Date(),
      isScanned: true,
      brand: product.brand,
      nutriscore: product.nutriscore,
      weight: product.weight
    };

    const dateStr = localDateStr(selectedDate);
    try {
      await addLogEntry(newEntry, dateStr);
      setDailyLog([newEntry, ...dailyLog]);
      handleAddXP(15);
      addNotification('success', `¡${product.name} añadido! 🍏 (+15 XP)`);
    } catch (e) {
      console.error('Error al guardar alimento escaneado:', e);
      addNotification('error', 'Error al guardar alimento escaneado ❌');
    }
  };

  const handleAddWeight = async (weight) => {
    const today = new Date();
    
    // Función auxiliar para tener una fecha constante sin afectar la zona horaria
    const getLocalYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = getLocalYMD(today);

    const existingEntryIndex = weightHistory.findIndex(entry => {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
      return getLocalYMD(entryDate) === todayStr;
    });

    let newHistory;
    if (existingEntryIndex >= 0) {
      // Update existing
      newHistory = [...weightHistory];
      newHistory[existingEntryIndex] = { ...newHistory[existingEntryIndex], weight, date: today };
    } else {
      // Add new
      newHistory = [...weightHistory, { id: Date.now(), weight, date: today }];
    }

    setWeightHistory(newHistory);

    // Persistir el peso del día (upsert en el backend)
    try {
      await saveWeightEntry(today, weight);
    } catch (error) {
      console.error("Error saving weight entry:", error);
      alert("Error guardando el peso en la nube, pero se guardó localmente.");
    }

    const updatedProfile = { ...profileData, current_weight: weight.toString() };
    if (!updatedProfile.start_weight) {
      updatedProfile.start_weight = weight.toString();
    }
    setProfileData(updatedProfile);

    if (user) {
      try {
        await updateProfile(updatedProfile, user.id);
      } catch (error) {
        console.error("Error saving weight to backend:", error);
        alert("Error guardando el peso en la nube, pero se guardó localmente.");
      }
    }

    try {
      const streakData = await getStreak();
      setStreak(streakData?.streak || 0);
    } catch (e) { console.error("Error updating streak after weight:", e); }

    handleAddXP(20);
    alert("¡Peso registrado! (+20 XP)");
  };

  const calculateLevel = (xp) => Math.floor((xp || 0) / 100) + 1;

  const handleAddXP = async (amount) => {
    if (!profileData) return;
    const currentXP = currentXPRef.current;
    const newXP = currentXP + amount;
    currentXPRef.current = newXP;

    const oldLevel = calculateLevel(currentXP);
    const newLevel = calculateLevel(newXP);

    setProfileData(prev => prev ? { ...prev, xp: newXP, level: newLevel } : prev);

    try {
      await updateProfile({ xp: newXP, level: newLevel });
    } catch (e) { console.error("Error persisting XP:", e); }

    if (newLevel > oldLevel) {
      addNotification('success', `¡Subiste al Nivel ${newLevel}! 🎉`);
    }
  };

  const handleSaveProfile = async (data) => {
    if (!user) return;
    const isFirstTimeSetup = !profileData; // Si no había perfil, es la primera vez
    try {
      console.log("Saving profile for user:", user.id);
      const updatedProfile = await updateProfile(data, user.id);
      console.log("Profile updated:", updatedProfile);
      setProfileData(updatedProfile);

      if (updatedProfile.username && updatedProfile.username !== user.username) {
        const newUserState = { ...user, username: updatedProfile.username };
        setUser(newUserState);
        localStorage.setItem('nutricoach_user', JSON.stringify(newUserState));
      }

      // Solo ir al dashboard la primera vez que se crea el perfil
      if (isFirstTimeSetup) {
        setCurrentView('dashboard');
        console.log("View set to dashboard (first-time setup)");
      }
      addNotification('success', 'Perfil actualizado correctamente ✨');

      try {
        const checkin = await getTodayCheckin();
        if (checkin) setTodayCheckin(checkin);
      } catch (e) { console.error(e); }

    } catch (error) {
      console.error(error);
      addNotification('error', `Error al guardar perfil: ${error.message}`);
      throw error; // Re-throw so ProfileScreen catch knows
    }
  };

  // --- Renderizado Condicional ---
  const renderScreen = () => {
    if (profileData) {
      switch (currentView) {
        case 'dashboard': 
          return <DashboardScreen 
            profileData={profileData} 
            dailyLog={dailyLog} 
            weightHistory={weightHistory} 
            isPremium={isPremium} 
            premiumUntil={premiumUntil} 
            streak={streak}
            onGoToProfile={() => setCurrentView('profile')} 
          />;
        case 'profile': 
          return <ProfileScreen 
            initialData={profileData} 
            weightHistory={weightHistory} 
            streak={streak}
            onSave={handleSaveProfile} 
            onBack={() => setCurrentView('dashboard')} 
            onLogout={handleLogout} 
            onDeleteAccount={handleDeleteAccount}
            onCancelPremium={handleCancelPremium}
            onReactivatePremium={handleReactivatePremium}
          />;
        case 'shopping': return <ShoppingListScreen items={shoppingList} onAddItem={handleAddShoppingItem} onDeleteItem={handleDeleteShoppingItem} onClearAll={handleClearShoppingList} />;
        case 'generator': return <MenuGeneratorScreen profileData={profileData} checkinData={todayCheckin} onAddRecipeToLog={handleAddRecipeToLog} onAddIngredients={handleAddIngredientsToShoppingList} addNotification={addNotification} />;
        case 'dailyLog': return (
          <DailyLogScreen
            profileData={profileData}
            dailyLog={dailyLog}
            onDeleteLogEntry={handleDeleteLogEntry}
            onAddIngredients={handleAddIngredientsToShoppingList}
            onAddScannedFood={handleAddScannedFood}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        );
        case 'progress': return <ProgressScreen profileData={profileData} weightHistory={weightHistory} onAddWeight={handleAddWeight} todayCheckin={todayCheckin} onCheckinCompleted={handleCheckinCompleted} />;
        case 'chat':
          return (
            <ChatScreen
              user={user}
              profileData={profileData}
              dailyLog={dailyLog}
              shoppingList={shoppingList}
              checkinData={todayCheckin}
              selectedDate={selectedDate}
              messages={chatMessages}
              setMessages={setChatMessages}
              onAddShoppingItems={async (items) => {
                try {
                  await mutateShoppingList(list =>
                    items.reduce((acc, name) => mergeIngredientIntoList(acc, name), list)
                  );
                  addNotification('success', `Añadidos ${items.length} productos a la lista 🛒`);
                } catch (e) { console.error('Error al añadir items:', e); }
              }}
              onAddLogEntry={async (entry) => {
                const normalizedMealType = normalizeMealType(entry.mealType);

                const newEntry = {
                  ...entry, 
                  mealType: normalizedMealType,
                  calories: entry.calories || 0,
                  protein: entry.protein || 0,
                  carbs: entry.carbs || 0,
                  fat: entry.fat || 0,
                  id: Date.now(), 
                  createdAt: new Date() 
                };
                
                const tmrDate = new Date(); tmrDate.setDate(tmrDate.getDate() + 1);
                const dateStr = entry.isTomorrow
                  ? localDateStr(tmrDate)
                  : localDateStr(selectedDate);

                try {
                  await addLogEntry(newEntry, dateStr);
                } catch (e) {
                  console.error('Error al guardar en diario:', e);
                }

                if (entry.isTomorrow) {
                  if (localDateStr(selectedDate) === localDateStr(tmrDate)) {
                    setDailyLog(prev => [newEntry, ...prev]);
                  }
                  addNotification('success', `Añadido para MAÑANA: ${entry.name} 📅`);
                } else {
                  setDailyLog(prev => [newEntry, ...prev]);
                  addNotification('success', `Añadido al diario: ${entry.name} 📅`);
                }
              }}
              onRemoveLogEntry={async (itemName) => {
                const dateStr = localDateStr(selectedDate);
                setDailyLog(prev => {
                  const index = prev.findIndex(item => item.name.toLowerCase().includes(itemName.toLowerCase()));
                  if (index > -1) {
                    addNotification('success', `Eliminado: ${prev[index].name} 🗑️`);
                    const newLogs = [...prev];
                    newLogs.splice(index, 1);
                    return newLogs;
                  }
                  addNotification('error', `No encontré "${itemName}" para borrar.`);
                  return prev;
                });
                try {
                  await deleteLogEntryByName(itemName, dateStr);
                } catch (e) { console.error('Error deleting log by name:', e); }
              }}
              onRemoveShoppingItem={handleDeleteShoppingItemByName}
              onClearDailyLog={async () => {
                const dateStr = localDateStr(selectedDate);
                try {
                  await clearDailyLog(dateStr);
                  setDailyLog([]);
                  addNotification('success', `Diario del día vaciado 🧹`);
                } catch (e) { 
                  console.error('Error clearing daily log:', e); 
                  addNotification('error', `Error al vaciar el diario`);
                }
              }}
              onClearShoppingList={handleClearShoppingList}
            />
          );
        case 'premium':
          return (
            <PremiumScreen 
              user={user} 
              onSubscribeSuccess={async () => {
                await subscribeToPremium();
                const updatedProfile = await getProfile();
                setProfileData(updatedProfile);
                setIsPremium(!!updatedProfile.is_premium);
                setPremiumUntil(updatedProfile.premium_until);
                addNotification('success', '¡Ya eres Premium! ⭐');
              }} 
              onGoBack={() => setCurrentView('dashboard')} 
            />
          );
        default: return <DashboardScreen 
          profileData={profileData} 
          dailyLog={dailyLog} 
          weightHistory={weightHistory} 
          isPremium={isPremium} 
          premiumUntil={premiumUntil} 
          streak={streak}
          onGoToProfile={() => setCurrentView('profile')} 
        />;
      }
    }
    return <ProfileScreen 
      initialData={profileData || { username: user?.username || '' }} 
      weightHistory={weightHistory} 
      streak={streak}
      onSave={handleSaveProfile} 
      onBack={null} 
      onLogout={handleLogout} 
      onDeleteAccount={handleDeleteAccount}
      onCancelPremium={handleCancelPremium}
      onReactivatePremium={handleReactivatePremium}
    />;
  };

  const handleCheckVerified = async () => {
    const isVerified = await checkVerificationStatus();
    if (isVerified) {
      const updatedUser = { ...user, isVerified: true };
      setUser(updatedUser);
      localStorage.setItem('nutricoach_user', JSON.stringify(updatedUser));
    } else {
      alert("Aún no detectamos la verificación. Asegúrate de hacer clic en el enlace del correo.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <ToastStyles />
      <ToastContainer notifications={notifications} onClose={removeNotification} />
      {/* Debug Tool for User Cleanup - REMOVED */}

      {isLoading ? (
        <LoadingScreen appName={APP_NAME} />
      ) : !user ? (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
          <header className="mb-8 flex flex-col items-center justify-center gap-3 pt-[env(safe-area-inset-top)]">
            <img src="/apple-touch-icon.png" alt="Logo de NutrIAmigo" className="w-24 h-24 rounded-2xl shadow-md" />
            <h1 className="text-4xl font-bold text-center text-emerald-600">{APP_NAME}</h1>
          </header>
          <AuthScreen 
            onLogin={handleLogin} 
            onRegister={handleRegister} 
            onResetPassword={handleResetPassword} 
          />
        </div>
      ) : !user.isVerified ? (
        <VerificationPendingScreen user={user} onCheckVerified={handleCheckVerified} />
      ) : (
        <Layout
          currentView={currentView}
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
          user={user}
          isProfileComplete={isProfileComplete}
          isPremium={isPremium}
        >
          {renderScreen()}
        </Layout>
      )}
    </div>
  );
}