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
import { loginUser, registerUser, getTodayCheckin, getProfile, updateProfile, logoutUser, checkVerificationStatus, getDailyLog, saveDailyLog, addLogEntry, deleteLogEntry, deleteLogEntryByName, clearDailyLog, addShoppingItem, deleteShoppingItem, clearShoppingList, getShoppingList, saveShoppingList, getWeightHistory, saveWeightHistory, getChatHistory, deleteUserAccount, syncUserWithBackend, subscribeToPremium, cancelPremium, reactivatePremium, getStreak } from './services/api.js';
import { auth, onAuthStateChanged } from './firebaseConfig';

const APP_NAME = "NutrIAmigo";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [user, setUser] = useState(null); // { id, username, email }
  const [todayCheckin, setTodayCheckin] = useState(null);

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPremium, setIsPremium] = useState(null); // null = loading, true/false = determined
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [streak, setStreak] = useState(0);
  const [shoppingList, setShoppingList] = useState([]);
  const [dailyLog, setDailyLog] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('nutricoach_chat');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem('nutricoach_chat', JSON.stringify(chatMessages));
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
            if (profile) setProfileData(profile);
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
  }, [currentView]);

  // --- Data Persistence Syncer ---

  const loadedDateRef = useRef(null);
  
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
      setDataLoaded(false);
      return;
    }

    const fetchStreak = async () => {
      if (!user) return;
      try {
        console.log("[STREAK] Fetching streak for user:", user.id);
        const streakData = await getStreak();
        console.log("[STREAK] Received:", streakData);
        setStreak(streakData?.streak || 0);
      } catch (streakErr) {
        console.error("Error fetching streak:", streakErr);
      }
    };

    const loadUserData = async () => {
      try {
        console.log("Loading user data for date:", selectedDate.toISOString());
        setDataLoaded(false); 

        setDailyLog([]);
        setWeightHistory([]);

        const dateStr = selectedDate.toISOString().split('T')[0];

        if (profileData) {
          setIsPremium(!!profileData.is_premium);
          setPremiumUntil(profileData.premium_until);
        }
        
        // Load Daily Log
        const logs = await getDailyLog(user.id, dateStr);
        setDailyLog(logs);

        // Load Weight History
        const history = await getWeightHistory();
        setWeightHistory(history);

        loadedDateRef.current = dateStr;
        
        await fetchStreak();
        
        setDataLoaded(true);
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

  useEffect(() => {
    if (!user || !dataLoaded) return;
    const dateStr = selectedDate.toISOString().split('T')[0];

    if (loadedDateRef.current !== dateStr) {
      return;
    }

    saveDailyLog(user.id, dateStr, dailyLog);
  }, [dailyLog, user, dataLoaded, selectedDate]);



  useEffect(() => {
    if (!user || !dataLoaded) return;
    saveWeightHistory(user.id, weightHistory);
  }, [weightHistory, user, dataLoaded]);

  const handleCheckinCompleted = (data) => {
    setTodayCheckin(data);
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
    setDataLoaded(false);
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
      setDataLoaded(false);
      localStorage.removeItem('nutricoach_user');
      setCurrentView('dashboard');
      alert("Tu cuenta y todos tus datos han sido borrados permanentemente.");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };


  const handleAddShoppingItem = async (itemName) => {
    const newItem = { id: Date.now(), name: itemName };
    setShoppingList([...shoppingList, newItem]);
    try {
      await addShoppingItem(itemName);
      handleAddXP(5);
    } catch (e) {
      console.error('Error al guardar item:', e);
      addNotification('error', 'Error al guardar en la lista de la compra ❌');
    }
  };

  const handleDeleteShoppingItem = async (itemId) => {
    const itemToDelete = shoppingList.find(i => i.id === itemId);
    setShoppingList(prev => prev.filter(item => item.id !== itemId));
    
    if (itemToDelete) {
      try {
        await deleteShoppingItem(itemToDelete.name);
      } catch (e) { console.error('Error deleting item:', e); }
    }
  };

  const handleDeleteShoppingItemByName = async (itemName) => {
    setShoppingList(prev => prev.filter(item => !item.name.toLowerCase().includes(itemName.toLowerCase())));
    try {
      await deleteShoppingItem(itemName);
    } catch (e) { console.error('Error deleting item by name:', e); }
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

  const handleAddRecipeToLog = async (recipe, mealType) => {
    let normalizedMealType = mealType ? mealType.toLowerCase() : 'snack';
    const typeMap = {
      'breakfast': 'desayuno',
      'lunch': 'comida',
      'dinner': 'cena',
      'snack': 'snack',
      'desayuno': 'desayuno',
      'comida': 'comida',
      'almuerzo': 'comida',
      'cena': 'cena'
    };
    if (typeMap[normalizedMealType]) {
      normalizedMealType = typeMap[normalizedMealType];
    }

    const newEntry = {
      id: Date.now() + Math.random(), // Unique ID for bulk adds
      name: recipe.name,
      calories: recipe.calories,
      mealType: normalizedMealType,
      createdAt: new Date(),
      recipeId: recipe.id
    };

    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      await addLogEntry(newEntry, dateStr);
      // 2. Update local state
      setDailyLog(prevLogs => [newEntry, ...prevLogs]);
      handleAddXP(10);
      addNotification('success', `Añadido al diario: ${recipe.name} 📅`);
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

  const parseIngredient = (str) => {
    const flowMatch = str.match(/^(.*?)\s*\(([\d\./,]+)\s*(.*?)\)$/);

    if (!flowMatch) {
      return { name: str.trim(), qty: 1, unit: null, isMeasurable: false };
    }

    const name = flowMatch[1].trim();
    const rawQty = flowMatch[2];
    const unit = flowMatch[3].trim();

    let qty = 0;
    if (rawQty.includes('/')) {
      const [num, den] = rawQty.split('/');
      qty = parseFloat(num) / parseFloat(den);
    } else {
      qty = parseFloat(rawQty.replace(',', '.'));
    }

    return { name, qty, unit, isMeasurable: true };
  };

  const handleAddIngredientsToShoppingList = async (recipeOrId) => {
    let recipe = recipeOrId;

    if (typeof recipeOrId === 'number' || typeof recipeOrId === 'string') {
      recipe = recipes.find(r => r.id === recipeOrId);
    }

    if (!recipe) return;

    const itemsToAdd = recipe.shoppingList || recipe.ingredients || [];
    if (itemsToAdd.length === 0) return;

    setShoppingList(prevList => {
      let newList = [...prevList];

      itemsToAdd.forEach(rawIngredient => {
        // Normalize raw string
        let ingredientStr = rawIngredient;
        if (typeof rawIngredient === 'object' && rawIngredient.name) {
          ingredientStr = `${rawIngredient.name} (${rawIngredient.amount})`; // Fallback for obj format
        }

        const newItem = parseIngredient(ingredientStr);
        let found = false;

        for (let i = 0; i < newList.length; i++) {
          const existingItem = parseIngredient(newList[i].name);

          if (existingItem.name.toLowerCase() === newItem.name.toLowerCase() &&
            existingItem.unit === newItem.unit) {

            const totalQty = existingItem.qty + newItem.qty;

            let newStr = "";
            if (existingItem.isMeasurable) {
              // Unless it's an integer.
              const displayQty = Number.isInteger(totalQty) ? totalQty : totalQty.toFixed(1).replace('.0', '');
              newStr = `${existingItem.name} (${displayQty}${existingItem.unit ? ' ' + existingItem.unit : ''})`;
              // User input was "(150g)", regex captured "g". 
              // Actually regex `\s*` absorbed space. 

            } else {
              // Or "Name (x2)".
              newStr = `${existingItem.name} (x${totalQty})`;
            }

            newList[i] = { ...newList[i], name: newStr };
            found = true;
            break;
          }
        }
        if (!found) {
          newList.push({ id: Date.now() + Math.random(), name: ingredientStr });
        }
      });

      return newList;
    });

    addNotification('success', `Ingredientes añadidos y organizados 🛒`);

    for (const item of itemsToAdd) {
        let name = item;
        if (typeof item === 'object' && item.name) {
            name = `${item.name} (${item.amount})`;
        }
        try {
            await addShoppingItem(name);
        } catch (e) {
            console.error('Error al persistir ingrediente:', e);
        }
    }
  };

  const handleAddScannedFood = async (product) => {
    const newEntry = {
      id: Date.now(),
      name: `${product.name} (${product.weight}g)`,
      calories: product.calories || 0,
      mealType: 'snack',
      createdAt: new Date(),
      isScanned: true,
      brand: product.brand,
      nutriscore: product.nutriscore,
      weight: product.weight
    };

    const dateStr = selectedDate.toISOString().split('T')[0];
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
    const isSameDay = (d1, d2) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    const existingEntryIndex = weightHistory.findIndex(entry => isSameDay(new Date(entry.date), today));

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

  const handleAddXP = (amount) => {
    if (!profileData) return;
    const currentXP = profileData.xp || 0;
    const newXP = currentXP + amount;
    const oldLevel = calculateLevel(currentXP);
    const newLevel = calculateLevel(newXP);

    const updatedProfile = { ...profileData, xp: newXP, level: newLevel };
    setProfileData(updatedProfile);
    // localStorage.setItem('nutricoach_profile', JSON.stringify(updatedProfile));

    if (newLevel > oldLevel) {
      alert(`¡FELICIDADES! Has subido al Nivel ${newLevel} 🎉`);
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
    console.log("Render Screen - currentView:", currentView, "profileData:", !!profileData);
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
        case 'shopping': return <ShoppingListScreen items={shoppingList} onAddItem={handleAddShoppingItem} onDeleteItem={handleDeleteShoppingItem} />;
        case 'generator': return <MenuGeneratorScreen profileData={profileData} checkinData={todayCheckin} onAddRecipeToLog={handleAddRecipeToLog} onAddIngredients={handleAddIngredientsToShoppingList} />;
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
                const newItems = items.map(name => ({ id: Date.now() + Math.random(), name }));
                setShoppingList(prev => [...prev, ...newItems]);
                for (const name of items) {
                  try { await addShoppingItem(name); } catch (e) { console.error('Error al añadir item:', e); }
                }
                addNotification('success', `Añadidos ${items.length} productos a la lista 🛒`);
              }}
              onAddLogEntry={async (entry) => {
                let normalizedMealType = entry.mealType ? entry.mealType.toLowerCase() : 'snack';
                const typeMap = {
                  'breakfast': 'desayuno', 'lunch': 'comida', 'dinner': 'cena', 'snack': 'snack',
                  'desayuno': 'desayuno', 'comida': 'comida', 'almuerzo': 'comida', 'cena': 'cena'
                };
                if (typeMap[normalizedMealType]) normalizedMealType = typeMap[normalizedMealType];

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
                
                const dateStr = entry.isTomorrow 
                  ? new Date(Date.now() + 86400000).toISOString().split('T')[0] 
                  : selectedDate.toISOString().split('T')[0];

                try {
                  await addLogEntry(newEntry, dateStr);
                } catch (e) {
                  console.error('Error al guardar en diario:', e);
                }

                if (entry.isTomorrow) {
                  const tmr = new Date();
                  tmr.setDate(tmr.getDate() + 1);
                  const tomorrowStr = tmr.toISOString().split('T')[0];
                  if (selectedDate.toISOString().split('T')[0] === tomorrowStr) {
                    setDailyLog(prev => [newEntry, ...prev]);
                  }
                  addNotification('success', `Añadido para MAÑANA: ${entry.name} 📅`);
                } else {
                  setDailyLog(prev => [newEntry, ...prev]);
                  addNotification('success', `Añadido al diario: ${entry.name} 📅`);
                  
                  const ingredientPart = entry.name.split(/ con | y /i).slice(1).join(' y ');
                  if (ingredientPart) {
                    const rawIngredients = ingredientPart.split(/,| y /i).map(i => i.trim()).filter(Boolean);
                    const newItems = rawIngredients.map(name => ({ id: Date.now() + Math.random(), name }));
                    if (newItems.length) {
                      setShoppingList(prev => [...prev, ...newItems]);
                      for (const name of rawIngredients) {
                        try { await addShoppingItem(name); } catch (e) { console.error('Error al añadir ingrediente:', e); }
                      }
                      addNotification('success', `Ingredientes añadidos a la lista de la compra: ${rawIngredients.join(', ')}`);
                    }
                  }
                }
              }}
              onRemoveLogEntry={async (itemName) => {
                const dateStr = selectedDate.toISOString().split('T')[0];
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
                const dateStr = selectedDate.toISOString().split('T')[0];
                try {
                  await clearDailyLog(dateStr);
                  setDailyLog([]);
                  addNotification('success', `Diario del día vaciado 🧹`);
                } catch (e) { 
                  console.error('Error clearing daily log:', e); 
                  addNotification('error', `Error al vaciar el diario`);
                }
              }}
              onClearShoppingList={async () => {
                setShoppingList([]);
                try {
                  await clearShoppingList();
                  addNotification('success', `Lista de la compra vaciada 🧹`);
                } catch (e) { console.error('Error clearing shopping list:', e); }
              }}
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