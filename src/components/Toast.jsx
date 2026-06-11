import React from 'react';


export function ToastContainer({ notifications, onClose }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {notifications.map((note) => (
                <div
                    key={note.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white backdrop-blur-md transform transition-all duration-300 animate-slide-in min-w-[280px] border border-white/20 ${note.type === 'error' ? 'bg-red-600/90' :
                            note.type === 'success' ? 'bg-emerald-600/90' :
                                'bg-blue-600/90'
                        }`}
                >
                    <span className="text-xl">
                        {note.type === 'error' ? '❌' : note.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <p className="font-medium text-sm flex-1">{note.message}</p>
                    <button
                        onClick={() => onClose(note.id)}
                        className="p-2 -mr-2 text-white/70 hover:text-white transition-colors cursor-pointer"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

// Helper hook or logic should be in App.jsx
const styles = `
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in {
  animation: slide-in 0.3s ease-out forwards;
}
`;

export const ToastStyles = () => <style>{styles}</style>;
