import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Camera, X, Flashlight, RefreshCw, ScanBarcode,
  CheckCircle2, AlertCircle, Sparkles, Volume2, VolumeX
} from 'lucide-react'
import { playScanSuccess, playScanError } from '../../utils/audioFeedback'
import { loadZXing, decodeEan13FromCanvas } from '../../utils/barcodeDecoder'

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Lector de Código de Barras',
  subtitle = 'Apunta la cámara hacia el código de barras o SKU del producto'
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const scanIntervalRef = useRef(null)
  const zxingReaderRef = useRef(null)
  const isScanningRef = useRef(false)
  const offscreenCanvasRef = useRef(null)

  const [hasCamera, setHasCamera] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [manualCode, setManualCode] = useState('')
  const [detectorSupported, setDetectorSupported] = useState(false)

  // Initialize and check BarcodeDetector availability
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setDetectorSupported(true)
    } else {
      setDetectorSupported(false)
    }
  }, [])

  const handleDetected = useCallback((rawCode) => {
    const code = (rawCode || '').trim()
    if (!code || isScanningRef.current) return
    isScanningRef.current = true

    // Feedback háptico en móviles
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(80) } catch {}
    }

    setScannedCode(code)
    if (soundEnabled) {
      playScanSuccess()
    }

    if (zxingReaderRef.current) {
      try { zxingReaderRef.current.reset() } catch {}
    }

    setTimeout(() => {
      onScan(code)
      onClose()
      isScanningRef.current = false
      setScannedCode('')
    }, 450)
  }, [onScan, onClose, soundEnabled])

  // Start video stream
  const startCamera = useCallback(async () => {
    setCameraError('')
    setTorchOn(false)
    setTorchSupported(false)

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta el acceso a la cámara.')
      }

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play().catch(() => {})
      }

      // Check torch capabilities
      const track = stream.getVideoTracks()[0]
      if (track?.getCapabilities) {
        const capabilities = track.getCapabilities()
        if (capabilities.torch) {
          setTorchSupported(true)
        }
      }

      setHasCamera(true)
    } catch (err) {
      console.warn('Error al acceder a la cámara:', err)
      setHasCamera(false)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Permite el acceso en los ajustes de tu navegador.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara conectada al dispositivo.')
      } else {
        setCameraError(err.message || 'No se pudo iniciar la cámara.')
      }
    }
  }, [facingMode])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset()
      } catch {}
      zxingReaderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const next = !torchOn
      await track.applyConstraints({
        advanced: [{ torch: next }]
      })
      setTorchOn(next)
    } catch (err) {
      console.warn('No se pudo activar la linterna:', err)
    }
  }

  // Switch between front and back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Camera start / stop on modal open / close
  useEffect(() => {
    if (isOpen) {
      isScanningRef.current = false
      setScannedCode('')
      setManualCode('')
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, startCamera, stopCamera])

  // Scanning loop (Triple Engine: ZXing + BarcodeDetector + Canvas Scanline)
  useEffect(() => {
    if (!isOpen || !hasCamera) return

    let active = true

    // 1. Motor Principal: ZXing Multi-Format (Compatible al 100% con Safari iOS, Chrome y Android)
    loadZXing().then((ZXing) => {
      if (!active || !ZXing || !videoRef.current || isScanningRef.current) return
      try {
        const reader = new ZXing.BrowserMultiFormatReader()
        zxingReaderRef.current = reader
        reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (!active || isScanningRef.current) return
          if (result && result.getText()) {
            handleDetected(result.getText())
          }
        })
      } catch (e) {
        console.warn('Aviso inicializando ZXing:', e)
      }
    }).catch(() => {})

    // 2. Motor Nativo: BarcodeDetector (Chrome/Edge Android)
    let nativeDetector = null
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = [
          'ean_13', 'ean_8', 'code_128', 'code_39', 'code_93',
          'upc_a', 'upc_e', 'qr_code', 'itf', 'data_matrix'
        ]
        nativeDetector = new window.BarcodeDetector({ formats })
      } catch (e) {
        console.warn('Aviso BarcodeDetector:', e)
      }
    }

    // 3. Motor Respaldo: Intervalo de análisis por Canvas para códigos 1D (EAN-13, UPC)
    scanIntervalRef.current = setInterval(async () => {
      if (!active || isScanningRef.current || !videoRef.current || videoRef.current.readyState < 2) {
        return
      }

      if (nativeDetector) {
        try {
          const barcodes = await nativeDetector.detect(videoRef.current)
          if (barcodes && barcodes.length > 0) {
            const match = barcodes[0]?.rawValue
            if (match) {
              handleDetected(match)
              return
            }
          }
        } catch {}
      }

      // Escaneo por Canvas en caso de que el navegador no tenga ZXing ni BarcodeDetector activo
      try {
        const v = videoRef.current
        const w = v.videoWidth || 640
        const h = v.videoHeight || 480
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas')
        }
        const canvas = offscreenCanvasRef.current
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h)
          const detected = decodeEan13FromCanvas(ctx, w, h)
          if (detected) {
            handleDetected(detected)
          }
        }
      } catch {}
    }, 120)

    return () => {
      active = false
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      if (zxingReaderRef.current) {
        try {
          zxingReaderRef.current.reset()
        } catch {}
        zxingReaderRef.current = null
      }
    }
  }, [isOpen, hasCamera, handleDetected])

  // Manual code submit
  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleDetected(manualCode.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#141417] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <ScanBarcode size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Sound toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title={soundEnabled ? 'Silenciar pitido' : 'Activar sonido'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Cerrar lector"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="relative bg-black flex items-center justify-center min-h-[260px] sm:min-h-[320px] overflow-hidden select-none">
          {hasCamera && !cameraError ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[380px]"
              />

              {/* Viewfinder target overlay with laser */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-64 h-44 sm:w-72 sm:h-48 rounded-xl border-2 border-white/60 dark:border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                  {/* Corner styling accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                  {/* Red Laser Scanner Animation */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-rose-500 via-red-400 to-rose-500 shadow-[0_0_12px_2px_rgba(244,63,94,0.9)] animate-pulse"
                    style={{
                      animation: 'barcodeLaser 2s ease-in-out infinite alternate',
                    }}
                  />

                  {/* Scanned detection toast */}
                  {scannedCode && (
                    <div className="absolute inset-0 bg-emerald-500/85 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-white text-center animate-fade-in z-20">
                      <CheckCircle2 size={36} className="text-white mb-1 animate-bounce" />
                      <p className="text-xs font-bold uppercase tracking-wider">¡Código Detectado!</p>
                      <p className="text-base font-mono font-black mt-0.5">{scannedCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom camera controls */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                      torchOn
                        ? 'bg-amber-400 text-slate-900 ring-2 ring-amber-300'
                        : 'bg-black/60 hover:bg-black/80 text-white'
                    }`}
                    title={torchOn ? 'Apagar linterna' : 'Encender linterna'}
                  >
                    <Flashlight size={18} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all shadow-md cursor-pointer"
                  title="Cambiar cámara"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-white flex flex-col items-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-bold text-slate-100 mb-1">
                {cameraError || 'Cámara no disponible'}
              </p>
              <p className="text-xs text-slate-300 mb-4">
                Puedes escribir o escanear el código con tu pistola lectora en el recuadro inferior.
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} /> Reintentar cámara
              </button>
            </div>
          )}
        </div>

        {/* Manual code input fallback & instructions */}
        <div className="p-3.5 bg-white dark:bg-[#141417] border-t border-slate-100 dark:border-zinc-800">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <ScanBarcode size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="O ingresa / escanea el código aquí…"
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#1B4FD8] outline-none transition uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 rounded-xl bg-[#1B4FD8] hover:bg-[#163FBF] disabled:opacity-50 text-white font-bold text-xs shrink-0 transition cursor-pointer"
            >
              Aplicar
            </button>
          </form>

          <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-zinc-500">
            <span>Compatible con EAN-13, EAN-8, UPC, Code 128 y QR</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">Pistolas USB / Bluetooth activas</span>
          </div>
        </div>
      </div>

      {/* Laser animation keyframes */}
      <style>{`
        @keyframes barcodeLaser {
          0% { top: 12%; }
          100% { top: 86%; }
        }
      `}</style>
    </div>
  )
}
