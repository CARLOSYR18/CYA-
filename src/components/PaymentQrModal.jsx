import { useState } from 'react'
import { QrCode, Copy, Check, X, Smartphone, Building2, ExternalLink, ShieldCheck } from 'lucide-react'

export default function PaymentQrModal({ isOpen, onClose, method, paymentConfig, amount, currency = 'S/' }) {
  const [copied, setCopied] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedCci, setCopiedCci] = useState(false)

  if (!isOpen) return null

  const isYape = method === 'yape'
  const isPlin = method === 'plin'
  const isTransfer = method === 'transfer'

  const methodData = isYape
    ? paymentConfig?.yape
    : isPlin
    ? paymentConfig?.plin
    : paymentConfig?.transfer

  const title = isYape ? 'Yape' : isPlin ? 'Plin' : 'Transferencia Bancaria'
  const phone = methodData?.phone || ''
  const holder = methodData?.holder || 'CYA STORE'
  const qrImage = methodData?.qr_image || ''

  const handleCopyPhone = () => {
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleCopyAccount = (num) => {
    if (!num) return
    navigator.clipboard.writeText(num)
    setCopiedAccount(true)
    setTimeout(() => setCopiedAccount(false), 2500)
  }

  const handleCopyCci = (num) => {
    if (!num) return
    navigator.clipboard.writeText(num)
    setCopiedCci(true)
    setTimeout(() => setCopiedCci(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#131627] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden transform transition-all animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar with Accent Color */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isYape
              ? 'bg-gradient-to-r from-[#742284] to-[#8E2BA3]'
              : isPlin
              ? 'bg-gradient-to-r from-[#00b49f] to-[#00d2b4]'
              : 'bg-gradient-to-r from-blue-700 to-indigo-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {isYape ? (
              <img
                src="/yape-logo.png"
                alt="Yape"
                className="w-10 h-10 rounded-2xl object-cover shadow-md ring-2 ring-white/30 shrink-0"
              />
            ) : isPlin ? (
              <img
                src="/plin-logo.png"
                alt="Plin"
                className="w-10 h-10 rounded-full object-cover shadow-md ring-2 ring-white/30 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-lg shadow-inner shrink-0">
                <Building2 size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight leading-none">
                  Cobrar con {title}
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 tracking-wider">
                  QR Oficial
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium mt-0.5">
                Muestra este código al cliente para pagar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Amount Badge */}
          <div className="text-center p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              Monto exacto a pagar
            </span>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {currency}{' '}
              {(Number(amount) || 0).toLocaleString('es-PE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center">
            {qrImage ? (
              <div className="relative p-3 bg-white rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/20 shadow-md">
                <img
                  src={qrImage}
                  alt={`QR ${title}`}
                  className="w-56 h-56 object-contain rounded-xl"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <QrCode size={11} /> Escanea con {title}
                </div>
              </div>
            ) : (
              <div className="w-56 h-56 rounded-2xl bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center p-4 text-center">
                <QrCode size={48} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Captura de QR no disponible
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Puedes subir la imagen del QR en <strong>Configuración de Empresa</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Account Details & 1-Click Copy */}
          <div className="space-y-2.5">
            {phone && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                      Número {title}
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {phone}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={3} />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {holder && (
              <div className="px-3 py-2 rounded-xl bg-slate-50/60 dark:bg-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Titular de la cuenta:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                  {holder}
                </span>
              </div>
            )}

            {isTransfer && methodData?.account_number && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Cta. {methodData?.bank || 'BCP'}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {methodData.account_number}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyAccount(methodData.account_number)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white cursor-pointer"
                >
                  {copiedAccount ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {isTransfer && methodData?.cci && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CCI Interbancario</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {methodData.cci}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCci(methodData.cci)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white cursor-pointer"
                >
                  {copiedCci ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={15} />
              <span>Entendido, Continuar con la Venta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

