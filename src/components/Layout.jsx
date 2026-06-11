import React from 'react';

// Iconos SVG estilizados para iOS (minimalismo)
const Icons = {
    Dashboard: ({ active }) => (
        <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    Diary: ({ active }) => (
        <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    ),
    Chat: ({ active }) => (
        <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
    ),
    Progress: ({ active }) => (
        <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
    ),
    Profile: ({ active }) => (
        <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
    ),
    List: ({ active }) => <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    Generator: ({ active }) => <svg className={`w-6 h-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    Logout: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
};

export default function Layout({ children, currentView, setCurrentView, onLogout, user, isProfileComplete = true, isPremium = null }) {
    
    // Función auxiliar para los botones de navegación (iOS Tab Bar)
    // eslint-disable-next-line no-unused-vars -- Icon sí se usa en el JSX
    const TabItem = ({ view, label, icon: Icon }) => {
        const active = currentView === view;
        const isDisabled = !isProfileComplete && view !== 'profile';

        return (
            <button
                onClick={() => {
                    if (isDisabled) return;
                    if (view === 'chat' && !isPremium) {
                        setCurrentView('premium');
                    } else {
                        setCurrentView(view);
                    }
                }}
                disabled={isDisabled}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 transition-all duration-200 ${isDisabled ? 'opacity-30' : ''}`}
            >
                <div className="relative">
                    <Icon active={active} />
                    {view === 'chat' && (
                        <span className="absolute -top-1.5 -right-1.5 text-[10px]">
                            {isPremium ? '✅' : '⭐'}
                        </span>
                    )}
                </div>
                <span className={`text-[9px] w-full text-center truncate font-medium mt-0.5 ${active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {label} {view === 'chat' && <span className="text-[7px] text-amber-600 font-black">PREMIUM</span>}
                </span>
            </button>
        );
    };

    // eslint-disable-next-line no-unused-vars -- Icon sí se usa en el JSX
    const SidebarItem = ({ view, label, icon: Icon }) => {
        const active = currentView === view;
        const isDisabled = !isProfileComplete && view !== 'profile';

        return (
            <button
                onClick={() => {
                    if (isDisabled) return;
                    if (view === 'chat' && !isPremium) {
                        setCurrentView('premium');
                    } else {
                        setCurrentView(view);
                    }
                }}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                } ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
            >
                <Icon active={active} />
                <span className="font-medium text-sm">{label}</span>
                {isDisabled && <span className="ml-auto text-xs">🔒</span>}
                {view === 'chat' && !isPremium && <span className="ml-auto text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">⭐ PREMIUM</span>}
            </button>
        );
    };

    return (
        <div className="h-screen bg-[#f9fafb] flex flex-col md:flex-row overflow-hidden pb-20 md:pb-0">
            
            {/* --- SIDEBAR (Desktop Only) --- */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed inset-y-0 h-full">
                <div className="p-8 border-b border-gray-50 flex flex-col items-center gap-2">
                    <img src="/apple-touch-icon.png" alt="Logo" className="w-16 h-16 rounded-2xl shadow-sm" />
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">NutrIAmigo</h1>
                </div>

                <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
                    <SidebarItem view="dashboard" label="Resumen" icon={Icons.Dashboard} />
                    <SidebarItem view="chat" label={isPremium ? "Coach IA ✅" : "Coach IA ⭐"} icon={Icons.Chat} />
                    <SidebarItem view="dailyLog" label="Diario" icon={Icons.Diary} />
                    <SidebarItem view="generator" label="Generador" icon={Icons.Generator} />
                    <SidebarItem view="shopping" label="Compra" icon={Icons.List} />
                    <SidebarItem view="progress" label="Progreso" icon={Icons.Progress} />
                    <SidebarItem view="profile" label="Perfil" icon={Icons.Profile} />

                    <div className="mt-auto pt-6 border-t border-gray-50">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <Icons.Logout />
                            <span className="font-medium text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* --- HEADER (Mobile Only) --- */}
            <header className="md:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-6 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src="/apple-touch-icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
                    <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
                        NutrIAmigo
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {isPremium ? (
                        <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm border border-amber-200">
                            ⭐ PREMIUM
                        </span>
                    ) : (
                        <button 
                            onClick={() => setCurrentView('premium')}
                            className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold hover:bg-emerald-200 transition-colors"
                        >
                            FREE
                        </button>
                    )}
                </div>
            </header>
            
            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 md:ml-64 p-4 md:p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto view-transition">
                    {/* --- BLOQUEO DE PERFIL (Setup Panel) --- */}
                    {!isProfileComplete && (
                        <div className="bg-white border-2 border-emerald-100 rounded-[2.5rem] p-8 mb-10 shadow-xl shadow-emerald-50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-emerald-100 transition-colors"></div>
                           
                           <div className="relative flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                               <div className="w-20 h-20 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-lg shadow-emerald-200 animate-bounce duration-[3s]">
                                   ✨
                               </div>
                               <div className="flex-1">
                                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">¡Casi listo, {user?.username || 'amigo'}!</h2>
                                   <p className="text-gray-500 mt-2 font-medium">Configura tu perfil físico para desbloquear a NutriCoach y tu Diario inteligente.</p>
                                   
                                   <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest">
                                       <span className="bg-gray-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">1. Edad y Género</span>
                                       <span className="bg-gray-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">2. Medidas</span>
                                       <span className="bg-gray-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100">3. Tu Meta</span>
                                   </div>
                               </div>
                           </div>
                        </div>
                    )}

                    {children}
                </div>
            </main>

            {/* --- BOTTOM TAB BAR (Mobile Only - iOS Native Style) --- */}
            <nav className="md:hidden fixed bottom-1 left-0 right-0 z-50 px-2">
                <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-3xl shadow-2xl flex items-center justify-around h-[72px] relative overflow-hidden ios-glass p-2">
                    <TabItem view="dashboard" label="Resumen" icon={Icons.Dashboard} />
                    <TabItem view="chat" label="Coach IA" icon={Icons.Chat} />
                    <TabItem view="dailyLog" label="Diario" icon={Icons.Diary} />
                    <TabItem view="generator" label="Generador" icon={Icons.Generator} />
                    <TabItem view="shopping" label="Compra" icon={Icons.List} />
                    <TabItem view="progress" label="Progreso" icon={Icons.Progress} />
                    <TabItem view="profile" label="Perfil" icon={Icons.Profile} />
                </div>
                {/* Safe Area Indicator Spacer */}
                <div className="h-[env(safe-area-inset-bottom)] bg-transparent"></div>
            </nav>
        </div>
    );
}
