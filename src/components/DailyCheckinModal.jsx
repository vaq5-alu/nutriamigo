import React, { useState } from 'react';

export default function DailyCheckinModal({ onSubmit, onClose }) {
    const [mood, setMood] = useState('');
    const [energy, setEnergy] = useState(5);
    const [sleep, setSleep] = useState(7);
    const [notes, setNotes] = useState('');

    const moods = [
        { emoji: '😊', label: 'Feliz' },
        { emoji: '😐', label: 'Normal' },
        { emoji: '😴', label: 'Cansado' },
        { emoji: '😢', label: 'Triste' },
        { emoji: '😡', label: 'Enojado' },
        { emoji: '⚡', label: 'Enérgico' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!mood) return alert("Por favor selecciona cómo te sientes.");
        onSubmit({ mood, energy_level: energy, sleep_hours: sleep, notes });
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                <div className="bg-emerald-600 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold">¡Buenos días! ☀️</h2>
                    <p className="text-emerald-100">Cuéntame cómo estás para ayudarte mejor hoy.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Mood Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">¿Cómo te sientes?</label>
                        <div className="flex justify-between gap-2">
                            {moods.map((m) => (
                                <button
                                    key={m.label}
                                    type="button"
                                    onClick={() => setMood(m.label)}
                                    className={`flex flex-col items-center p-2 rounded-lg transition ${mood === m.label ? 'bg-emerald-100 ring-2 ring-emerald-500 transform scale-110' : 'hover:bg-gray-50'}`}
                                >
                                    <span className="text-3xl mb-1">{m.emoji}</span>
                                    <span className="text-xs text-gray-500">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Energy Slider */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700">Nivel de Energía</label>
                            <span className="text-sm font-bold text-emerald-600">{energy}/10</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={energy}
                            onChange={(e) => setEnergy(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>Agotado</span>
                            <span>A tope</span>
                        </div>
                    </div>

                    {/* Sleep Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Horas de sueño</label>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setSleep(Math.max(0, sleep - 1))} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">-</button>
                            <span className="text-xl font-bold text-gray-900 w-12 text-center">{sleep}h</span>
                            <button type="button" onClick={() => setSleep(Math.min(24, sleep + 1))} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">+</button>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="¿Algo que deba saber? (Ej: Tengo estrés por el trabajo...)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            rows="2"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition transform hover:scale-[1.02]"
                    >
                        Guardar y Empezar
                    </button>
                </form>
            </div>
        </div>
    );
}
