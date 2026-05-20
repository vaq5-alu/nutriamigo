import React from 'react';

// --- Componente de Pantalla: Pantalla de Carga ---
// (Usaremos el APP_NAME del componente principal App)
export default function LoadingScreen({ appName }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold text-emerald-600 mb-4">{appName}</h1>
      <p className="text-lg text-gray-700 mb-8">Cargando tu perfil...</p>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );
}