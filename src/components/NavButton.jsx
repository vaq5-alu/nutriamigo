// src/components/NavButton.jsx

import React from 'react';

// ¡MODIFICADO! Añadimos 'isDanger' como prop
export default function NavButton({ label, isActive, onClick, isDanger = false }) {
  
  // Clases base
  const baseClasses = "flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200";
  
  // Clases condicionales
  let activeClasses = "";
  
  if (isDanger) {
    // Si es un botón "peligroso" (Logout)
    activeClasses = "text-red-600 hover:bg-red-50";
  } else if (isActive) {
    // Si es el botón activo
    activeClasses = "bg-emerald-600 text-white";
  } else {
    // Botón normal inactivo
    activeClasses = "text-gray-700 hover:bg-gray-100";
  }

  return (
    <button className={`${baseClasses} ${activeClasses}`} onClick={onClick}>
      {label}
    </button>
  );
}