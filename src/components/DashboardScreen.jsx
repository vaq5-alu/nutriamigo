import React from 'react';

// Componentes de Tarjetas de Estadísticas
const StatCard = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between relative overflow-hidden">
    <div className="relative z-10">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h3>
      {subtitle && (
        <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${color}`}>
          {color === 'text-emerald-600' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
          {subtitle}
        </p>
      )}
    </div>
    <div className={`p-3 rounded-2xl shadow-inner relative z-10 ${color.replace('text-', 'bg-').replace('600', '50')}`}>
      {icon}
    </div>
  </div>
);

const Icons = {
  Calories: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.5-7 3 10 13 11 13 11z" />
    </svg>
  ),
  Streak: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Weight: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  )
};

export default function DashboardScreen({ profileData, dailyLog, isPremium, streak, onGoToProfile }) {
  if (!profileData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Bienvenido a NutriCoach!</h2>
        <p className="text-gray-600 mb-8">Para comenzar tu viaje, necesitamos conocerte un poco mejor.</p>
        <button
          onClick={onGoToProfile}
          className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg shadow-lg hover:bg-emerald-700 transition"
        >
          Configurar mi Perfil
        </button>
      </div>
    );
  }

  const dailyCalories = profileData.calories || 2000;
  const consumedCalories = dailyLog ? dailyLog.reduce((total, entry) => total + (parseInt(entry.calories) || 0), 0) : 0;
  const progress = Math.min((consumedCalories / dailyCalories) * 100, 100);
  const streakValue = streak || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hola, {profileData.name || 'Viajero'} 👋</h2>
          <p className="text-gray-600">Aquí tienes tu resumen de hoy.</p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-gray-500">Nivel {profileData.level || 1}</p>
          <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden ml-auto">
            <div className="h-full bg-indigo-500" style={{ width: `${(profileData.xp || 0) % 100}%` }}></div>
          </div>
          {isPremium && (
            <div className="mt-2 flex flex-col items-end">
              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1 shadow-sm">
                ⭐ PLAN PREMIUM ACTIVADO
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Calorías Consumidas" 
          value={`${consumedCalories} kcal`} 
          subtitle={`${Math.round(progress)}% del objetivo diario`}
          icon={Icons.Calories}
          color="text-emerald-600"
        />
        <StatCard 
          title="Racha Actual" 
          value={`${streakValue} Días`} 
          subtitle={streakValue > 0 ? "¡Mantén el ritmo!" : "¡Empieza hoy!"}
          icon={Icons.Streak}
          color="text-amber-600"
        />
        <StatCard 
          title="Peso Actual" 
          value={`${profileData.current_weight || '--'} kg`} 
          subtitle={`Meta: ${profileData.target_weight || '--'} kg`}
          icon={Icons.Weight}
          color="text-indigo-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Actividad Reciente</h3>
        <div className="space-y-4">
          {(!dailyLog || dailyLog.length === 0) ? (
            <p className="text-gray-500 text-center py-4">No has registrado alimentos hoy.</p>
          ) : (
            dailyLog.slice(0, 3).map((entry, i) => (
              <div key={entry.id || i} className="flex items-center gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                  {entry.meal_type === 'desayuno' ? '☕' :
                    entry.meal_type === 'comida' ? '🥗' :
                      entry.meal_type === 'cena' ? '🌙' : '🍎'}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{entry.name}</h4>
                  <p className="text-xs text-gray-500 capitalize">{entry.meal_type || 'snack'}</p>
                </div>
                <span className="font-bold text-gray-700">+{entry.calories} kcal</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}