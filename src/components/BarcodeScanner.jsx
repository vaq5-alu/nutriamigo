import React, { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ onScanSuccess, onScanFailure }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const html5QrCode = new Html5Qrcode("reader");

        // Configuramos la cámara para leer mejor códigos de barras
        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 150 },
            disableFlip: false,
            formatsToSupport: [ 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.EAN_8, 
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39
            ]
        };
        
        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText, decodedResult) => {
                if (isMounted) {
                    html5QrCode.stop().then(() => {
                        onScanSuccess(decodedText, decodedResult);
                    }).catch(err => console.error("Error parando escáner:", err));
                }
            },
            () => {
                // Ignorar errores por frame sin leer nada
            }
        ).then(() => {
            if (!isMounted) {
                // Si React desmontó el componente mientras la cámara se iniciaba, forzamos parar.
                html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
            }
        }).catch((err) => {
            if (isMounted) {
                console.error("No se pudo iniciar la cámara trasera:", err);
                setHasError(true);
                if (onScanFailure) onScanFailure(err);
            }
        });

        // Limpieza robusta para evitar cámaras duplicadas (especialmente en React Strict Mode)
        return () => {
            isMounted = false;
            try {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop()
                        .then(() => html5QrCode.clear())
                        .catch(err => console.error("Error limpiando cámara al desmontar:", err));
                } else {
                    html5QrCode.clear();
                }
            } catch (error) {
                console.error("Error síncrono al limpiar:", error);
            }
            
            // Limpiamos el DOM manualmente si la librería se atasca
            const readerElement = document.getElementById("reader");
            if (readerElement) {
                readerElement.innerHTML = ''; 
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

