import React, { useState } from 'react';
import { sendEmailVerification, auth } from '../firebaseConfig';

export default function VerificationPendingScreen({ user, onCheckVerified }) {
    const [resendStatus, setResendStatus] = useState('');

    const handleResend = async () => {
        if (!auth.currentUser) return;
        try {
            await sendEmailVerification(auth.currentUser);
            setResendStatus('¡Correo enviado! Revisa tu bandeja de entrada (y spam).');
        } catch (error) {
            console.error(error);
            setResendStatus('Error enviando correo. Intenta más tarde.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-gray-100 max-w-md mx-auto mt-10 pt-[env(safe-area-inset-top)]">
            <div className="text-5xl mb-6">✉️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifica tu Correo</h2>
            <p className="text-center text-gray-600 mb-6">
                Hemos enviado un enlace de confirmación a: <br />
                <span className="font-semibold text-emerald-600">{user.email}</span>
            </p>

            <div className="space-y-4 w-full">
                <button
                    onClick={onCheckVerified}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
                >
                    ¡Ya lo he verificado!
                </button>

                <button
                    onClick={handleResend}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                    Reenviar correo
                </button>
            </div>

            {resendStatus && (
                <p className="mt-4 text-sm text-center text-emerald-600">{resendStatus}</p>
            )}

            <p className="mt-8 text-xs text-center text-gray-400">
                Si no verificas tu cuenta, no podrás acceder a las funciones de NutrIAmigo.
            </p>
        </div>
    );
}
