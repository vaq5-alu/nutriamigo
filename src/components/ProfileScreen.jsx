import React, { useState } from 'react';

export default function ProfileScreen({ initialData, streak, onSave, onBack, onLogout, onDeleteAccount, onCancelPremium, onReactivatePremium }) {
  const [profile, setProfile] = useState(initialData);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // personal, metas, salud
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [showCancelPremiumModal, setShowCancelPremiumModal] = useState(false);

  // Sincronizar estado local si los datos del backend tardan en cargar o se actualizan
  React.useEffect(() => {
    setProfile(initialData);
  }, [initialData]);



  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfile({ ...profile, avatarBase64: dataUrl });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newProfile = { ...profile };

    if (type === 'checkbox') {
      newProfile[name] = checked;
    } else {
      newProfile[name] = value;
      if (name === 'current_weight' && !initialData.start_weight) {
        newProfile.start_weight = value;
      }
    }
    setProfile(newProfile);
    setSaveStatus({ type: '', message: '' }); // Clear message on change
  };

  const isProfileCompleteLocal = (() => {
    const required = ['age', 'gender', 'height', 'current_weight', 'target_weight', 'goal'];
    return required.every(field => profile[field] && profile[field] !== '');
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus({ type: 'loading', message: '' });
    try {
      await onSave(profile);
      setSaveStatus({ type: 'success', message: '¡Perfil guardado correctamente!' });
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message || 'Hubo un error al guardar.' });
    }
  };

  const isChecked = (name) => profile[name] || false;

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mi Perfil</h2>
          <p className="text-gray-500 text-sm mt-1">Personaliza tu experiencia y metas</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
            Cerrar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
        {/* Columna Izquierda: Gamificación */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl mx-auto flex items-center justify-center text-4xl mb-3 shadow-inner transform group-hover:scale-110 transition-transform duration-300 overflow-hidden">
              {profile.avatarBase64 ? (
                <img src={profile.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                '🏆'
              )}
            </div>
            {profile.username && (
              <p className="text-sm font-bold text-emerald-600 mb-0.5">@{profile.username}</p>
            )}
            {profile.name && (
              <p className="text-xs text-gray-500 mb-1">{profile.name}</p>
            )}
            <h3 className="text-xl font-black text-gray-900 italic uppercase">Nivel {profile.level || 1}</h3>
            <div className="flex items-center justify-center gap-2 mt-0.5">
               <span className="text-emerald-600 font-bold text-base">{profile.xp || 0}</span>
               <span className="text-gray-400 font-bold text-xs tracking-widest uppercase">XP TOTAL</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3 p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(profile.xp || 0) % 100}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-2 tracking-widest uppercase">Faltan {100 - ((profile.xp || 0) % 100)} XP para el siguiente nivel</p>
          </div>

          <div className="bg-emerald-600 p-4 rounded-[1.5rem] text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
             <h4 className="font-bold opacity-80 text-xs uppercase tracking-widest mb-0.5">Racha</h4>
             <p className="text-2xl font-black tracking-tighter">{streak} Días 📅</p>
             <p className="text-[10px] mt-1 opacity-70">{streak > 0 ? "¡Sigue así!" : "¡Empieza hoy!"}</p>
          </div>
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-5">

            {/* Tabs Nav */}
            <div className="flex bg-gray-50 p-1.5 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'personal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                📋 Datos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('metas')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'metas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                🎯 Metas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('salud')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'salud' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                🏥 Salud
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('premium')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${activeTab === 'premium' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                ⭐ Premium
              </button>
            </div>

            {/* Contenido - Personal */}
            {activeTab === 'personal' && (
            <section className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                 <div className="flex flex-col items-center gap-2">
                    <label className="cursor-pointer group relative">
                       {profile.avatarBase64 ? (
                         <img src={profile.avatarBase64} alt="Avatar" className="w-20 h-20 rounded-[1.25rem] object-cover border-4 border-emerald-50 group-hover:opacity-80 transition-opacity shadow-sm" />
                       ) : (
                         <div className="w-20 h-20 rounded-[1.25rem] bg-gray-50 border-4 border-gray-50 flex items-center justify-center text-2xl group-hover:bg-gray-100 transition-colors shadow-sm">👤</div>
                       )}
                       <div className="absolute inset-0 bg-black bg-opacity-40 rounded-[1.25rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-white text-[10px] font-bold text-center leading-tight">CAMBIAR<br/>FOTO</span>
                       </div>
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                 </div>
                 
                 <div>
                    <h4 className="text-xl font-bold text-gray-900 tracking-tight">Datos Personales</h4>
                    <p className="text-gray-500 text-sm">Tu información básica visible</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nickname</label>
                  <input
                    type="text"
                    name="username"
                    value={profile.username || ''}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-gray-800"
                    placeholder="Usuario"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Nombre Real</label>
                  <input
                    type="text"
                    name="name"
                    value={profile.name || ''}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-gray-50 border-transparent rounded-[1.25rem] focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-gray-800"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              {/* Zona de Cuenta */}
              {(onLogout || onDeleteAccount) && (
                <section className="space-y-3 pt-4 mt-4 border-t border-gray-100">
                  <h4 className="text-xl font-bold text-gray-900 tracking-tight">Gestión de Cuenta</h4>
                  <div className="flex flex-wrap gap-4">
                    {onLogout && (
                      <button type="button" onClick={onLogout} className="px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-colors active:scale-95">
                        Cerrar Sesión
                      </button>
                    )}
                    {onDeleteAccount && (
                      <button type="button" onClick={() => setShowDeleteModal(true)} className="px-6 py-3 bg-red-50 text-red-600 border-2 border-red-50 font-bold rounded-2xl hover:bg-red-100 transition-colors active:scale-95">
                        Borrar Cuenta Definitivamente
                      </button>
                    )}
                  </div>
                </section>
              )}

            </section>
            )}

            {/* Contenido - Premium */}
            {activeTab === 'premium' && (
              <section className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${profile.is_premium ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                      {profile.is_premium ? '⭐' : '🔓'}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 tracking-tight">Suscripción y Facturación</h4>
                      <p className="text-gray-500 text-sm">Gestiona tu plan y pagos</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                   <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Plan</p>
                      <p className="text-sm font-black text-emerald-600">NutriCoach Pro</p>
                      <p className="text-xs text-gray-400">0,00€/mes</p>
                   </div>
                   <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Estado</p>
                      <div className="flex items-center gap-1.5">
                         <div className={`w-2 h-2 rounded-full ${profile.is_premium ? 'bg-emerald-500' : 'bg-gray-300'} animate-pulse`}></div>
                         <p className="text-sm font-black text-gray-900">{profile.is_premium ? 'Activo' : 'Inactivo'}</p>
                      </div>
                   </div>
                   <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Próximo Evento</p>
                      <p className="text-sm font-black text-gray-900">{profile.premium_until ? new Date(profile.premium_until).toLocaleDateString() : 'N/A'}</p>
                   </div>
                </div>

                <div className="bg-gray-950 rounded-[2rem] p-5 text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   
                   <h5 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-sm">💳</span>
                      Ajustes de Renovación
                   </h5>

                   {profile.is_premium ? (
                     <div className="space-y-3 relative z-10">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                           <div>
                              <p className="font-bold">Renovación Automática</p>
                              <p className="text-xs text-gray-400 mt-1">Tu plan se renovará el {new Date(profile.premium_until).toLocaleDateString()}</p>
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               if (profile.auto_renew === 0) {
                                 onReactivatePremium();
                               } else {
                                 setShowCancelPremiumModal(true);
                               }
                             }}
                             className={`px-5 py-2 rounded-xl font-black text-sm transition-all shadow-lg active:scale-95 ${
                               (profile.auto_renew === 0) 
                               ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20' 
                               : 'bg-white text-red-500 hover:bg-red-50 shadow-white/10 border border-red-500/30'
                             }`}
                           >
                             {(profile.auto_renew === 0) ? 'Reactivar Suscripción' : 'Desactivar Renovación'}
                           </button>
                        </div>

                        {!profile.auto_renew && (
                           <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                              <span className="text-xl">⚠️</span>
                              <p className="text-xs text-amber-200/80 leading-relaxed">
                                 Has desactivado la renovación. Tu acceso Premium finalizará permanentemente el <strong>{new Date(profile.premium_until).toLocaleDateString()}</strong>.
                              </p>
                           </div>
                        )}
                     </div>
                   ) : (
                     <div className="text-center py-4">
                        <p className="text-gray-400 mb-6 font-medium">No tienes ninguna suscripción activa actualmente.</p>
                        <button 
                           type="button"
                           onClick={() => window.location.hash = '#premium'}
                           className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                        >
                           Activar Premium ⭐
                        </button>
                     </div>
                   )}
                </div>

                <div className="space-y-2">
                   <h5 className="font-bold text-gray-900 ml-1 text-sm italic">Historial de Facturación (Simulado)</h5>
                   <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest">
                            <tr>
                               <th className="px-4 py-2">Fecha</th>
                               <th className="px-4 py-2">Descripción</th>
                               <th className="px-4 py-2">Importe</th>
                               <th className="px-4 py-2">Estado</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {profile.is_premium && (
                               <tr>
                                  <td className="px-4 py-2 font-medium text-gray-600">{new Date().toLocaleDateString()}</td>
                                  <td className="px-4 py-2 font-bold text-gray-900">Suscripción Mensual</td>
                                  <td className="px-4 py-2 font-black text-gray-900">0,00€</td>
                                  <td className="px-4 py-2"><span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">PAGADO</span></td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
              </section>
            )}

            {/* Contenido - Metas y Físico */}
            {activeTab === 'metas' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {!isProfileCompleteLocal && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-start gap-3 shadow-sm">
                  <div className="text-lg mt-0.5">💡</div>
                  <div>
                    <h5 className="font-bold text-emerald-900 leading-tight">¿Por qué es obligatorio?</h5>
                    <p className="text-sm text-emerald-700 mt-1">
                      NutrIAmigo necesita estos datos físicos para calcular tus calorías diarias y proporcionarte recomendaciones seguras a través del Coach IA.
                    </p>
                  </div>
                </div>
              )}

              {/* Sección Físico */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">⏀</div>
                   <h4 className="text-xl font-bold text-gray-900 tracking-tight">Medidas Básicas</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Edad {!profile.age && <span className="text-red-500 font-black ml-1">●</span>}
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={profile.age || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-xl focus:bg-white focus:ring-2 outline-none transition-all font-bold text-gray-800 ${!profile.age ? 'border-amber-200' : 'border-transparent'}`}
                      placeholder="Ej: 25"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Género {!profile.gender && <span className="text-red-500 font-black ml-1">●</span>}
                    </label>
                    <select
                      name="gender"
                      value={profile.gender || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-xl focus:bg-white focus:ring-2 outline-none transition-all font-bold text-gray-800 appearance-none ${!profile.gender ? 'border-amber-200' : 'border-transparent'}`}
                    >
                      <option value="">-- Selecciona --</option>
                      <option value="hombre">Hombre</option>
                      <option value="mujer">Mujer</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Peso Actual (kg) {!profile.current_weight && <span className="text-red-500 font-black ml-1">●</span>}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="current_weight"
                      value={profile.current_weight || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-xl focus:bg-white focus:ring-2 outline-none transition-all font-bold text-gray-800 ${!profile.current_weight ? 'border-amber-200' : 'border-transparent'}`}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Altura (cm) {!profile.height && <span className="text-red-500 font-black ml-1">●</span>}
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={profile.height || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-xl focus:bg-white focus:ring-2 outline-none transition-all font-bold text-gray-800 ${!profile.height ? 'border-amber-200' : 'border-transparent'}`}
                      placeholder="Ej: 175"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest ml-1">
                    Peso Objetivo (kg) {!profile.target_weight && <span className="text-red-500 font-black ml-1">●</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      name="target_weight"
                      value={profile.target_weight || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-emerald-50/50 border-2 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-black text-lg text-emerald-900 ${!profile.target_weight ? 'border-amber-300' : 'border-emerald-100'}`}
                      placeholder="70.0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300 font-black text-sm">TARGET</div>
                  </div>
                </div>
              </section>

              {/* Sección Metas */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">🎯</div>
                   <h4 className="text-xl font-bold text-gray-900 tracking-tight">Plan Nutricional</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Tu Objetivo {!profile.goal && <span className="text-red-500 font-black ml-1">●</span>}
                    </label>
                    <select
                      name="goal"
                      value={profile.goal || ''}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 bg-gray-50 border-2 rounded-xl focus:bg-white focus:ring-2 outline-none font-bold text-gray-800 appearance-none ${!profile.goal ? 'border-amber-200' : 'border-transparent'}`}
                    >
                      <option value="">-- Selecciona --</option>
                      <option value="perder-peso">Perder Peso</option>
                      <option value="ganar-musculo">Ganar Músculo</option>
                      <option value="mantener-peso">Mantener Peso</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Calorías Diarias (Opcional)</label>
                    <input type="number" name="calories" value={profile.calories || ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 outline-none transition-all font-bold text-gray-800" placeholder="Ej: 2000" />
                  </div>
                </div>
              </section>
            </div>
            )}

            {/* Contenido - Salud */}
            {activeTab === 'salud' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">🥗</div>
                 <h4 className="text-xl font-bold text-gray-900 tracking-tight">Restricciones</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['gluten', 'lactosa', 'celiaquia', 'diabetes'].map((item) => (
                  <label key={item} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isChecked(item) ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'}`}>
                    <span className="text-sm font-bold text-gray-700 capitalize">{item}</span>
                    <input
                      type="checkbox"
                      name={item}
                      checked={isChecked(item)}
                      onChange={handleChange}
                      className="h-6 w-6 text-emerald-600 border-gray-300 rounded-xl focus:ring-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </section>
            )}

            {saveStatus.message && (
              <div className={`p-4 rounded-2xl mb-4 text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${
                saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
                saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                {saveStatus.type === 'loading' && <span className="inline-block animate-spin mr-2">⏳</span>}
                {saveStatus.message}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saveStatus.type === 'loading'}
                className={`w-full flex justify-center py-3.5 px-4 rounded-[1.25rem] shadow-xl text-base font-black text-white transition-all outline-none active:scale-95 ${
                  saveStatus.type === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {saveStatus.type === 'loading' ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </form>
        </div>
      </div >

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Borrar Cuenta Definitivamente</h3>
            <p className="text-gray-600 mb-6">Esta acción no se puede deshacer. Todos tus datos se perderán.</p>
            
            <input 
              type="password" 
              placeholder="Escribe tu contraseña para confirmar" 
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full p-4 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
            />
            
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                }}
                className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  onDeleteAccount(deletePassword);
                  setShowDeleteModal(false);
                }}
                className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/30"
              >
                Borrar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Premium Modal */}
      {showCancelPremiumModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Desactivar Renovación?</h3>
            <p className="text-gray-600 mb-6">Podrás seguir disfrutando de las ventajas Premium hasta el final de tu periodo actual, pero no se te cobrará el próximo mes.</p>
            
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowCancelPremiumModal(false)}
                className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Volver
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowCancelPremiumModal(false);
                  onCancelPremium();
                }}
                className="flex-1 py-3 text-white font-bold bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-500/30"
              >
                Sí, Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}