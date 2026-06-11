import React, { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';

const MealSection = ({ title, entries, onDelete, icon, color }) => {
  const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-2">
      <div className={`p-2.5 ${color.bg} flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-bold ${color.text}`}>{title}</h3>
        </div>
        <span className={`font-bold ${color.text}`}>{totalCalories} kcal</span>
      </div>

      <div className="divide-y divide-gray-50">
        {entries.length === 0 ? (
          <p className="p-2 text-xs text-gray-400 italic text-center">No hay alimentos registrados.</p>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition">
              <div>
                <p className="font-medium text-gray-900">{entry.name}</p>
                <p className="text-xs text-gray-500">
                  {entry.calories} kcal • P: {entry.protein}g C: {entry.carbs}g G: {entry.fat}g {entry.isScanned && '• 📸 Escaneado'}
                </p>
              </div>
              <button
                onClick={() => onDelete(entry.id)}
                className="text-gray-400 hover:text-red-500 transition p-2"
                title="Eliminar"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {entries.length > 0 && (
        <div className="p-2 bg-gray-50 text-center border-t border-gray-100">
          <button className="text-xs font-medium text-gray-500 hover:text-emerald-600 transition">
            + Añadir más a {title}
          </button>
        </div>
      )}
    </div>
  );
};

export default function DailyLogScreen({ profileData, dailyLog, onDeleteLogEntry, onAddScannedFood, selectedDate = new Date(), onDateChange }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null); // { name, calories100g, nutriscore, brand }
  const [grams, setGrams] = useState(100);
  const [mealType, setMealType] = useState('snack');

  // Agrupar por tipo de comida
  const groupedLog = {
    desayuno: dailyLog.filter(e => e.mealType === 'desayuno'),
    comida: dailyLog.filter(e => e.mealType === 'comida'),
    cena: dailyLog.filter(e => e.mealType === 'cena'),
    snack: dailyLog.filter(e => e.mealType === 'snack'),
  };

  const totalCalories = dailyLog.reduce((sum, item) => sum + (item.calories || 0), 0);
  const goalCalories = profileData?.calories || 2000;
  const remaining = goalCalories - totalCalories;

  const handleScanSuccess = async (decodedText) => {
    setIsScanning(false);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
      const data = await response.json();

      if (data.status === 1) {
        const product = data.product;
        setScannedProduct({
          name: product.product_name || "Producto desconocido",
          brand: product.brands || "",
          calories100g: product.nutriments['energy-kcal_100g'] || 0,
          protein100g: product.nutriments['proteins_100g'] || 0,
          carbs100g: product.nutriments['carbohydrates_100g'] || 0,
          fat100g: product.nutriments['fat_100g'] || 0,
          nutriscore: product.nutriscore_grade?.toUpperCase() || "?",
          image: product.image_front_small_url
        });
        setGrams(100); // Reset default
      } else {
        alert("Producto no encontrado en OpenFoodFacts");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      alert("Error al buscar el producto");
    }
  };

  const handleAddProduct = () => {
    if (!scannedProduct) return;

    // Escalar valores por 100g a la cantidad elegida (macros con 1 decimal)
    const perGrams = (value100g, decimals = 0) => {
      const factor = Math.pow(10, decimals);
      return Math.round(((value100g * grams) / 100) * factor) / factor;
    };

    onAddScannedFood({
      name: scannedProduct.name,
      calories: perGrams(scannedProduct.calories100g),
      protein: perGrams(scannedProduct.protein100g, 1),
      carbs: perGrams(scannedProduct.carbs100g, 1),
      fat: perGrams(scannedProduct.fat100g, 1),
      brand: scannedProduct.brand,
      nutriscore: scannedProduct.nutriscore,
      weight: grams,
      mealType: mealType
    });

    setScannedProduct(null); // Close modal
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-end mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Diario de Comidas</h2>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() - 1);
                onDateChange(newDate);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              ◀️
            </button>
            <span className="text-lg font-semibold text-gray-700 capitalize">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(selectedDate.getDate() + 1);
                onDateChange(newDate);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              ▶️
            </button>
            {selectedDate.toDateString() !== new Date().toDateString() && (
              <button
                onClick={() => onDateChange(new Date())}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Volver a Hoy
              </button>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Día</p>
          <p className={`text-2xl font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {totalCalories} <span className="text-sm text-gray-400 font-normal">/ {goalCalories} kcal</span>
          </p>
          <div className="flex gap-3 justify-end mt-2 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
            <div className="flex flex-col items-end">
              <span className="text-blue-600">Proteínas</span>
              <span className="text-gray-900">{Math.round(dailyLog.reduce((s, i) => s + (Number(i.protein) || 0), 0))}g</span>
            </div>
            <div className="flex flex-col items-end border-l border-gray-200 pl-3">
              <span className="text-amber-600">Carbos</span>
              <span className="text-gray-900">{Math.round(dailyLog.reduce((s, i) => s + (Number(i.carbs) || 0), 0))}g</span>
            </div>
            <div className="flex flex-col items-end border-l border-gray-200 pl-3">
              <span className="text-rose-600">Grasas</span>
              <span className="text-gray-900">{Math.round(dailyLog.reduce((s, i) => s + (Number(i.fat) || 0), 0))}g</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setIsScanning(true)}
          className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 text-sm"
        >
          📷 Escanear Código de Barras
        </button>
      </div>

      <MealSection
        title="Desayuno"
        entries={groupedLog.desayuno}
        onDelete={onDeleteLogEntry}
        icon="☕"
        color={{ bg: 'bg-orange-50', text: 'text-orange-800' }}
      />

      <MealSection
        title="Comida"
        entries={groupedLog.comida}
        onDelete={onDeleteLogEntry}
        icon="🥗"
        color={{ bg: 'bg-emerald-50', text: 'text-emerald-800' }}
      />

      <MealSection
        title="Cena"
        entries={groupedLog.cena}
        onDelete={onDeleteLogEntry}
        icon="🌙"
        color={{ bg: 'bg-indigo-50', text: 'text-indigo-800' }}
      />

      <MealSection
        title="Snacks"
        entries={groupedLog.snack}
        onDelete={onDeleteLogEntry}
        icon="🍎"
        color={{ bg: 'bg-pink-50', text: 'text-pink-800' }}
      />

      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
            <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 text-gray-500 text-xl">✕</button>
            <h3 className="text-xl font-bold mb-4 text-center">Escanear Producto</h3>
            <BarcodeScanner onScanSuccess={handleScanSuccess} />
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-2">{scannedProduct.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{scannedProduct.brand}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Calorías / 100g</p>
                <p className="text-xl font-bold text-indigo-600">{scannedProduct.calories100g}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Nutri-Score</p>
                <p className="text-xl font-bold text-emerald-600">{scannedProduct.nutriscore}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (gramos)</label>
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comida</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="desayuno">Desayuno</option>
                  <option value="comida">Comida</option>
                  <option value="cena">Cena</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-indigo-900">Total Calorías:</span>
                  <span className="font-bold text-xl text-indigo-700">
                    {Math.round((scannedProduct.calories100g * grams) / 100)} kcal
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1 text-sm text-indigo-800">
                  <span>P: {Math.round((scannedProduct.protein100g * grams) / 10) / 10}g</span>
                  <span>C: {Math.round((scannedProduct.carbs100g * grams) / 10) / 10}g</span>
                  <span>G: {Math.round((scannedProduct.fat100g * grams) / 10) / 10}g</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setScannedProduct(null)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={handleAddProduct} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                Añadir al Diario
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}