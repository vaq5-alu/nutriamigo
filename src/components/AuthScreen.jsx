// src/components/AuthScreen.jsx

import React, { useState } from 'react';

// Este componente recibe las 2 funciones de auth desde App.jsx
export default function AuthScreen({ onLogin, onRegister, onResetPassword }) {
  // Estado para el formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Nuevo campo para usuario

  // Modos: 'login', 'register', 'reset'
  const [mode, setMode] = useState('login'); // 'login', 'register', 'reset'

  // Manejador del formulario
  const handleSubmit = (e) => {
    e.preventDefault(); // Evita que la página se recargue
    if (mode === 'register') {
      onRegister(username, email, password);
    } else if (mode === 'login') {
      onLogin(email, password);
    } else if (mode === 'reset') {
      onResetPassword(email);
    }
  };

  const getTitle = () => {
    if (mode === 'register') return 'Crear Cuenta';
    if (mode === 'reset') return 'Recuperar Contraseña';
    return 'Iniciar Sesión';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
        {getTitle()}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Nombre de Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Tu nombre de usuario"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Correo Electrónico
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="tu@correo.com"
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6} // Firebase requiere al menos 6 caracteres
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>
        )}

        {mode === 'login' && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="text-xs text-gray-500 hover:text-emerald-600 transition"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        <button
          type="submit"
          className="w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          {mode === 'register' ? 'Registrarme' : mode === 'reset' ? 'Enviar correo' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
        >
          {mode === 'register'
            ? '¿Ya tienes cuenta? Inicia sesión'
            : mode === 'reset'
              ? 'Volver al inicio de sesión'
              : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
}