import React, { useState } from 'react';
import { recipes } from '../data/recipeDatabase.js';
import { generateSmartMenu } from '../services/geminiService.js';

// --- Componente de Tarjeta de Receta ---
function RecipeCard({ recipe, onAddRecipeToLog, mealType, onAddIngredients, isAI }) {
  return (
    <div className={`p-4 rounded-lg shadow-sm border ${isAI ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-bold ${isAI ? 'text-purple-800' : 'text-emerald-800'}`}>{recipe.name}</h3>
            {isAI && <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">✨ IA</span>}
          </div>
          <p className="text-sm text-gray-600">Calorías: {recipe.calories} kcal</p>
          {recipe.reason && <p className="text-xs text-gray-500 mt-1 italic">"{recipe.reason}"</p>}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Carrito (Solo si tiene ingredientes definidos, la IA a veces no los da detallados para el carrito) */}
          {recipe.ingredients && (
            <button
              onClick={() => onAddIngredients(recipe)}
              title="Añadir ingredientes a la lista"
              className={`p-2 text-white text-sm font-medium rounded-md shadow-sm ${isAI ? 'bg-purple-500 hover:bg-purple-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              🛒
            </button>
          )}

          <button
            onClick={() => onAddRecipeToLog(recipe, mealType || recipe.mealType)}
            title="Añadir al diario"
            className={`px-3 py-2 text-white text-sm font-medium rounded-md shadow-sm ${isAI ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
          >
            + Añadir
          </button>
        </div>
      </div>

      {/* Tags / Ingredientes */}
      <div className="mt-2 flex flex-wrap gap-1">
        {recipe.tags && recipe.tags.map(tag => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full">
            {tag}
          </span>
        ))}
        {isAI && recipe.ingredients && recipe.ingredients.map((ing, idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
            {ing}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MenuGeneratorScreen({ profileData, checkinData, onAddRecipeToLog, onAddIngredients }) {
  const [mealType, setMealType] = useState('comida');
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // --- Modo Local (Filtro) ---
  const handleGenerateLocal = () => {
    const userGoal = profileData.goal;
    const userIntolerances = profileData.intolerances || [];

    const results = recipes.filter(recipe => {
      // 1. Must match Meal Type (Basic filter)
      const mealTypeMatch = recipe.tags.includes(mealType);

      let isSafe = true;
      for (const intolerance of userIntolerances) {
        if (recipe.tags.includes(intolerance)) { isSafe = false; break; }
      }

      return mealTypeMatch && isSafe;
    });

    // Optional: Sort by goal relevance?
    setSuggestedRecipes(results);
  };

  // --- Modo IA (Gemini) ---
  const handleGenerateAI = async () => {
    setLoading(true);
    setSuggestedRecipes([]);
    try {
      const aiMenu = await generateSmartMenu(profileData, checkinData, customPrompt);
      setSuggestedRecipes(aiMenu);
    } catch (error) {
      alert("Error al conectar con el Chef NutriIA. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToDiary = () => {
    suggestedRecipes.forEach(recipe => {
      onAddRecipeToLog(recipe, recipe.mealType);
    });
    alert("¡Menú completo añadido al diario!");
  };

  const handleAddAllToShopping = () => {
    suggestedRecipes.forEach(recipe => {
      onAddIngredients(recipe.shoppingList || recipe.ingredients); // Use optimized shopping list if available
    });
    alert("¡Ingredientes añadidos a la lista de compra!");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Generador de Menú</h2>

        {/* Toggle IA */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => { setIsAiMode(false); setSuggestedRecipes([]); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${!isAiMode ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Local
          </button>
          <button
            onClick={() => { setIsAiMode(true); setSuggestedRecipes([]); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1 ${isAiMode ? 'bg-purple-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span>✨</span> IA
          </button>
        </div>
      </div>

      {/* Controles */}
      {!isAiMode ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Quiero ideas para...</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="desayuno">Desayuno</option>
              <option value="comida">Comida</option>
              <option value="cena">Cena</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <div className="flex-1 sm:self-end">
            <button
              onClick={handleGenerateLocal}
              className="w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
            >
              ¡Sugerir!
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué te apetece hoy? (Opcional)</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Quiero tostadas para desayunar y pescado para cenar. Algo ligero."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
            />
          </div>

          <button
            onClick={handleGenerateAI}
            disabled={loading}
            className="w-full px-8 py-3 bg-purple-600 text-white font-bold rounded-full shadow-lg hover:bg-purple-700 disabled:opacity-50 transition transform hover:scale-[1.02]"
          >
            {loading ? '🧠 Diseñando tu Plan...' : '✨ Generar Plan Diario Personalizado'}
          </button>
        </div>
      )}

      {/* Resultados */}
      <div className="mt-6 space-y-4">
        {loading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-purple-600 font-medium">El Chef está cocinando ideas...</p>
          </div>
        )}

        {!loading && suggestedRecipes.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            {isAiMode ? 'Dile al Chef qué te apetece o déjalo en blanco para una sorpresa.' : 'Pulsa "Sugerir" para ver recetas.'}
          </p>
        )}

        {/* Bulk Actions for AI Menu */}
        {!loading && suggestedRecipes.length > 0 && isAiMode && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="flex-1">
              <h4 className="font-bold text-purple-900">Plan Propuesto</h4>
              <p className="text-sm text-purple-700">¿Te gusta este menú?</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddAllToShopping} className="px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium">
                + Lista Compra
              </button>
              <button onClick={handleAddAllToDiary} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                Confirmar y Añadir al Diario
              </button>
            </div>
          </div>
        )}

        {suggestedRecipes.map((recipe, index) => (
          <RecipeCard
            key={recipe.id || index}
            recipe={recipe}
            onAddRecipeToLog={onAddRecipeToLog}
            mealType={isAiMode ? recipe.mealType : mealType}
            onAddIngredients={onAddIngredients}
            isAI={isAiMode}
          />
        ))}
      </div>
    </div>
  );
}