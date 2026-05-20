import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ onScanSuccess, onScanFailure }) {
    const scannerRef = useRef(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        // Utilizamos cámara trasera preferentemente, con caja rectangular ideal para códigos de barras 1D
        const config = { 
            fps: 10, 
            qrbox: { width: 300, height: 150 },
            aspectRatio: 1.0,
            disableFlip: false
        };
        
        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText, decodedResult) => {
                // Detener escáner tras éxito
                if (scannerRef.current) {
                    scannerRef.current.stop().then(() => {
                        onScanSuccess(decodedText, decodedResult);
                    }).catch(err => console.error("Error parando escáner:", err));
                }
            },
            (errorMessage) => {
                // Se llama en cada frame que no reconoce nada, se ignora
            }
        ).catch((err) => {
            console.error("No se pudo iniciar la cámara trasera:", err);
            setHasError(true);
            if (onScanFailure) onScanFailure(err);
        });

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Error limpiando:", err));
            }
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div className="w-full max-w-md mx-auto">
            <div id="reader" className="w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
                {hasError && (
                    <div className="text-center p-4">
                        <p className="text-red-500 font-semibold mb-2">No se pudo acceder a la cámara.</p>
                        <p className="text-sm text-gray-500">Comprueba que has dado permisos en el navegador para usar la cámara y refresca la página.</p>
                    </div>
                )}
            </div>
            {!hasError && (
                <p className="text-center text-sm text-gray-500 mt-4">
                    Apunta la cámara trasera al código de barras del producto (procura que haya buena luz).
                </p>
            )}
        </div>
    );
}

