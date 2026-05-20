import React, { useState } from 'react';

// --- Componente de Pantalla: Lista de la Compra (Módulo 5) ---
export default function ShoppingListScreen({ items, onAddItem, onDeleteItem }) {
  const [newItemName, setNewItemName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newItemName.trim() === "") return;
    onAddItem(newItemName.trim());
    setNewItemName("");
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Lista de la Compra</h2>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Ej. Leche, Huevos..."
          className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Añadir
        </button>
      </form>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-gray-500 text-center">Tu lista de la compra está vacía.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
            <span className="text-gray-800">{item.name}</span>
            <button
              onClick={() => onDeleteItem(item.id)}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Borrar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}