import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

function ConfigErrorScreen({ error }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-7 shadow-2xl text-center space-y-4 backdrop-blur-md">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-2xl font-bold shadow-inner">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-white font-display">
          Error de Configuración del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
          {error || 'Faltan variables de entorno requeridas para conectar con Supabase en este entorno de producción.'}
        </p>
        <div className="pt-3 text-[11px] text-slate-500 border-t border-slate-800">
          CYA ERP — Por motivos de seguridad se prohíbe operar en modo demo desprotegido.
        </div>
      </div>
    </div>
  )
}

const configError = typeof window !== 'undefined' ? window.__CYA_CONFIG_ERROR__ : null

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {configError ? <ConfigErrorScreen error={configError} /> : <App />}
  </React.StrictMode>
)
