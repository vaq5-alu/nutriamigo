import React, { useState } from 'react';

export default function ProductDetailsModal({ product, onConfirm, onCancel }) {
    const [grams, setGrams] = useState(100);

    // Calcular valores basados en los gramos
    const ratio = grams / 100;
    const calories = Math.round((product.caloriesPer100g || 0) * ratio);
    const protein = ((product.proteinPer100g || 0) * ratio).toFixed(1);
    const carbs = ((product.carbsPer100g || 0) * ratio).toFixed(1);
    const fat = ((product.fatPer100g || 0) * ratio).toFixed(1);

    // Lógica de "Consejo"
    const getVerdict = () => {
        const score = product.nutriscore?.toUpperCase();
        if (score === 'A' || score === 'B') return { text: "¡Excelente elección! Este producto es nutricionalmente equilibrado.", color: "text-green-600", bg: "bg-green-50" };
        if (score === 'C') return { text: "Consumo moderado. Es un producto aceptable.", color: "text-yellow-600", bg: "bg-yellow-50" };
        return { text: "¡Ojo! Alto en calorías/grasas. Intenta reducir la porción o buscar alternativas frescas.", color: "text-red-600", bg: "bg-red-50" };
    };

    const verdict = getVerdict();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto">

                {/* Header con Imagen */}
                <div className="relative h-48 bg-gray-100 flex items-center justify-center">
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full object-contain" />
                    ) : (
                        <span className="text-4xl">🍎</span>
                    )}
                    <button onClick={onCancel} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100">✕</button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Título y Marca */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 leading-tight">{product.name}</h2>
                        <p className="text-gray-500">{product.brand}</p>
                    </div>

                    {/* Nutri-Score y Veredicto */}
                    <div className={`p-4 rounded-lg border ${verdict.bg} ${verdict.color}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg">Nutri-Score: {product.nutriscore?.toUpperCase() || '?'}</span>
                        </div>
                        <p className="text-sm font-medium">💡 {verdict.text}</p>
                    </div>

                    {/* Selector de Cantidad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">¿Cuánto vas a comer?</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={grams}
                                onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-gray-600">gramos</span>
                        </div>
                    </div>

                    {/* Tabla Nutricional Dinámica */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Información Nutricional ({grams}g)</h4>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                                <p className="text-xs text-gray-500">Calorías</p>
                                <p className="font-bold text-gray-800">{calories}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Proteína</p>
                                <p className="font-bold text-gray-800">{protein}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Carbs</p>
                                <p className="font-bold text-gray-800">{carbs}g</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Grasas</p>
                                <p className="font-bold text-gray-800">{fat}g</p>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm({ ...product, calories, weight: grams })}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:bg-emerald-700"
                        >
                            Añadir al Diario
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
