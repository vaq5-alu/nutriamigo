import React, { useState } from 'react';

export default function PremiumScreen({ onSubscribeSuccess, onGoBack }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });

    const handleSubscribe = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate network delay
        setTimeout(async () => {
            try {
                await onSubscribeSuccess();
                setSuccess(true);
            } catch {
                alert("Error al procesar el pago simulado.");
            } finally {
                setLoading(false);
            }
        }, 1500);
    };

    if (success) {
        return (
            <div className="max-w-md mx-auto text-center py-20 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg">
                    ⭐
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido al Club Premium!</h2>
                <p className="text-gray-600 mb-8">Tu acceso al NutriCoach IA ya está activo por los próximos 30 días.</p>
                <button
                    onClick={onGoBack}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl hover:bg-emerald-700 transition-all hover:scale-[1.02]"
                >
                    Empezar a usar NutriCoach
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">NutrIAmigo <span className="text-emerald-600">Premium</span></h2>
                <p className="text-lg text-gray-600 max-w-md mx-auto">Desbloquea el poder de la IA y alcanza tus metas con un asistente personal 24/7.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Benefits */}
                <div className="space-y-6 bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100">
                    <h3 className="text-xl font-bold text-emerald-900 mb-4">¿Qué incluye?</h3>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 text-xl">✅</span>
                            <div>
                                <p className="font-bold text-emerald-900 text-sm">NutriCoach IA Ilimitado</p>
                                <p className="text-emerald-700 text-xs mt-0.5">Chat inteligente para resolver dudas y registrar comidas al instante.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 text-xl">✅</span>
                            <div>
                                <p className="font-bold text-emerald-900 text-sm">Análisis de Macros</p>
                                <p className="text-emerald-700 text-xs mt-0.5">Estimación precisa de proteínas, carbohidratos y grasas.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-emerald-500 text-xl">✅</span>
                            <div>
                                <p className="font-bold text-emerald-900 text-sm">Sin Publicidad</p>
                                <p className="text-emerald-700 text-xs mt-0.5">Experiencia 100% limpia y enfocada en tu salud.</p>
                            </div>
                        </li>
                    </ul>
                    <div className="pt-4 border-t border-emerald-200">
                        <p className="text-2xl font-black text-emerald-900">0,00€ <span className="text-sm font-normal text-emerald-700">/ mes (Prueba)</span></p>
                    </div>
                </div>

                {/* Mock Payment Form */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Pasarela de Pago</h3>
                    <form onSubmit={handleSubscribe} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Número de Tarjeta</label>
                            <input
                                type="text"
                                placeholder="4242 4242 4242 4242"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                value={cardData.number}
                                onChange={e => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    val = val.replace(/(.{4})/g, '$1 ').trim().substring(0, 19);
                                    setCardData({...cardData, number: val});
                                }}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Vencimiento</label>
                                <input
                                    type="text"
                                    placeholder="MM / YY"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    value={cardData.expiry}
                                    onChange={e => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (val.length >= 2) {
                                            val = val.substring(0, 2) + ' / ' + val.substring(2, 4);
                                        }
                                        setCardData({...cardData, expiry: val.substring(0, 7)});
                                    }}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">CVC</label>
                                <input
                                    type="text"
                                    placeholder="123"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    value={cardData.cvc}
                                    onChange={e => setCardData({...cardData, cvc: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center italic">Esto es una simulación. No introduzcas datos reales.</p>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${loading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]'}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </span>
                            ) : "Confirmar Suscripción"}
                        </button>
                    </form>
                </div>
            </div>

            <button
                onClick={onGoBack}
                className="mt-12 text-sm text-gray-400 hover:text-emerald-600 font-medium transition-colors mx-auto block"
            >
                ← Volver al inicio
            </button>
        </div>
    );
}
