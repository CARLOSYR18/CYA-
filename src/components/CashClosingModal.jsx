import { useState, useMemo, useRef } from 'react'
import {
  DollarSign, Calculator, Printer, CheckCircle2, AlertTriangle,
  ArrowRight, ShieldCheck, X, Calendar, Wallet, Smartphone, CreditCard,
  Building, RefreshCw, FileText
} from 'lucide-react'

const fmtMoney = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function CashClosingModal({ open, onClose, sales = [], company = null, currentUser = null }) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Apertura de caja (sencillo base)
  const [initialCash, setInitialCash] = useState(() => {
    try {
      return localStorage.getItem(`cya_cash_initial_${todayStr}`) || '100.00'
    } catch {
      return '100.00'
    }
  })

  // Conteo de efectivo físico al cierre (billetes + monedas)
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [printing, setPrinting] = useState(false)
  const printReceiptRef = useRef(null)

  // Filtrar ventas de la fecha seleccionada que NO estén anuladas
  const daySales = useMemo(() => {
    return (sales || []).filter((s) => {
      if (s.status === 'anulado') return false
      const sDate = s.created_at ? s.created_at.slice(0, 10) : ''
      return sDate === selectedDate
    })
  }, [sales, selectedDate])

  // Desglose por método de pago
  const breakdown = useMemo(() => {
    let efectivo = 0, efectivoCount = 0
    let yape = 0, yapeCount = 0
    let plin = 0, plinCount = 0
    let transfer = 0, transferCount = 0
    let pos = 0, posCount = 0
    let credito = 0, creditoCount = 0

    daySales.forEach((s) => {
      const tot = Number(s.total) || 0
      const method = (s.payment_method || '').toLowerCase()

      if (s.status === 'pendiente') {
        credito += tot
        creditoCount++
        return
      }

      if (method.includes('yape')) {
        yape += tot
        yapeCount++
      } else if (method.includes('plin')) {
        plin += tot
        plinCount++
      } else if (method.includes('transf') || method.includes('bcp') || method.includes('bbva') || method.includes('banco')) {
        transfer += tot
        transferCount++
      } else if (method.includes('pos') || method.includes('tarjeta') || method.includes('card')) {
        pos += tot
        posCount++
      } else {
        // Por defecto efectivo
        efectivo += tot
        efectivoCount++
      }
    })

    const totalFacturado = efectivo + yape + plin + transfer + pos + credito
    const totalCobrado = efectivo + yape + plin + transfer + pos
    const digitalTotal = yape + plin + transfer + pos

    return {
      efectivo, efectivoCount,
      yape, yapeCount,
      plin, plinCount,
      transfer, transferCount,
      pos, posCount,
      credito, creditoCount,
      totalFacturado,
      totalCobrado,
      digitalTotal,
      salesCount: daySales.length
    }
  }, [daySales])

  // Cuadre de Efectivo
  const aperturaNum = Number(initialCash) || 0
  const expectedCash = aperturaNum + breakdown.efectivo
  const countedNum = countedCash !== '' ? Number(countedCash) : null
  const difference = countedNum !== null ? countedNum - expectedCash : null

  // Guardar cierre en historial local
  const handleSaveClosing = () => {
    try {
      const closingRecord = {
        id: `CIERRE-${Date.now()}`,
        date: selectedDate,
        closed_at: new Date().toISOString(),
        cashier_name: currentUser?.name || currentUser?.email || 'Cajero Principal',
        cashier_email: currentUser?.email || '',
        initial_cash: aperturaNum,
        cash_sales: breakdown.efectivo,
        expected_cash: expectedCash,
        counted_cash: countedNum,
        difference: difference,
        breakdown,
        notes: notes.trim(),
      }

      const existing = JSON.parse(localStorage.getItem('cya_cash_closings') || '[]')
      existing.unshift(closingRecord)
      localStorage.setItem('cya_cash_closings', JSON.stringify(existing.slice(0, 100)))
      localStorage.setItem(`cya_cash_initial_${selectedDate}`, String(aperturaNum))

      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose?.()
      }, 1600)
    } catch (err) {
      alert('Error guardando el arqueo: ' + err.message)
    }
  }

  // Imprimir reporte térmico de 80mm
  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 150)
  }

  if (!open) return null

  const companyName = company?.name || 'MI EMPRESA'
  const companyRuc = company?.ruc ? `R.U.C. ${company.ruc}` : ''
  const cashierName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Cajero de Turno'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* ─── Modal Header ─── */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand/10 dark:bg-brand/20 text-brand flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Cierre de Caja & Arqueo de Turno
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Auditoría de ingresos por método de pago y cuadre de efectivo físico
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Modal Body ─── */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Top Controls: Selector de Fecha & Cajero */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              <span className="font-semibold text-slate-600 dark:text-zinc-300">Fecha del Arqueo:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 font-medium">
              <span>Operador:</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">{cashierName}</span>
            </div>
          </div>

          {/* 4 Quick Stat Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Facturado</p>
              <p className="text-base sm:text-lg font-black font-mono text-emerald-900 dark:text-emerald-300 mt-0.5">{fmtMoney(breakdown.totalFacturado)}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">{breakdown.salesCount} ventas válidas</p>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Efectivo en Caja</p>
              <p className="text-base sm:text-lg font-black font-mono text-blue-900 dark:text-blue-300 mt-0.5">{fmtMoney(breakdown.efectivo)}</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-500 mt-0.5">{breakdown.efectivoCount} transacciones</p>
            </div>

            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Billeteras Digitales</p>
              <p className="text-base sm:text-lg font-black font-mono text-purple-900 dark:text-purple-300 mt-0.5">{fmtMoney(breakdown.yape + breakdown.plin)}</p>
              <p className="text-[10px] text-purple-600 dark:text-purple-500 mt-0.5">Yape ({breakdown.yapeCount}) • Plin ({breakdown.plinCount})</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">Bancos & Tarjetas</p>
              <p className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-zinc-100 mt-0.5">{fmtMoney(breakdown.transfer + breakdown.pos)}</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{breakdown.transferCount + breakdown.posCount} transacciones</p>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-zinc-800/40 font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] flex justify-between">
              <span>Método de Pago</span>
              <span>Total Recaudado</span>
            </div>
            
            <div className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">💵</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Efectivo en Ventas</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">{breakdown.efectivoCount} operaciones</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">{fmtMoney(breakdown.efectivo)}</span>
            </div>

            <div className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold text-xs">📱</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Yape</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">{breakdown.yapeCount} operaciones</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">{fmtMoney(breakdown.yape)}</span>
            </div>

            <div className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">📲</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Plin</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">{breakdown.plinCount} operaciones</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">{fmtMoney(breakdown.plin)}</span>
            </div>

            <div className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs">🏦</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Transferencias (BCP / Interbancario)</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">{breakdown.transferCount} operaciones</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">{fmtMoney(breakdown.transfer)}</span>
            </div>

            <div className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">💳</span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-zinc-100">Tarjeta / POS</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">{breakdown.posCount} operaciones</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100">{fmtMoney(breakdown.pos)}</span>
            </div>

            {breakdown.credito > 0 && (
              <div className="p-3 flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs">⏳</span>
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-200">Ventas al Crédito (Por Cobrar)</p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">{breakdown.creditoCount} pendientes</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-amber-900 dark:text-amber-200">{fmtMoney(breakdown.credito)}</span>
              </div>
            )}
          </div>

          {/* ─── Cuadre de Efectivo Físico (Auditoría) ─── */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/80 space-y-4">
            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand" />
              Auditoría y Cuadre de Caja Físico
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Fondo Inicial en Caja (Sencillo de Apertura)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={initialCash}
                    onChange={(e) => setInitialCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Efectivo base dejado al inicio del turno.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Efectivo Real Contado en Cajón (Cierre)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Ingrese total contado..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Billetes y monedas físicas al cerrar la caja.</p>
              </div>
            </div>

            {/* Resultado del Cuadre */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Efectivo Esperado (Fondo Inicial + Ventas Efectivo):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{fmtMoney(expectedCash)}</span>
              </div>

              {countedNum !== null && (
                <>
                  <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                    <span>Efectivo Real Físico Contado:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{fmtMoney(countedNum)}</span>
                  </div>

                  <div className={`p-3 rounded-xl flex items-center justify-between font-bold ${
                    Math.abs(difference) < 0.01
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : difference > 0
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {Math.abs(difference) < 0.01 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      <span>
                        {Math.abs(difference) < 0.01
                          ? '✓ CAJA CUADRADA EXACTA'
                          : difference > 0
                          ? `+ SOBRANTE EN CAJA`
                          : `- FALTANTE EN CAJA`}
                      </span>
                    </div>
                    <span className="font-mono text-base font-black">
                      {difference >= 0 ? `+${fmtMoney(difference)}` : fmtMoney(difference)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 text-xs mb-1">
                Observaciones / Justificación de Cierre (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. S/ 50 pagados a delivery de emergencia, vuelto pendiente, etc."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

          </div>

        </div>

        {/* ─── Modal Actions Footer ─── */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Ticket Cierre (80mm)</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveClosing}
              className="px-5 py-2.5 rounded-2xl bg-brand hover:bg-brand/90 text-white text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-md shadow-brand/20"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Arqueo Registrado!</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Guardar y Cerrar Turno</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ─── Printable Thermal Ticket Layout (80mm) ─── */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 text-black font-mono text-[11px] leading-tight">
        <div className="max-w-[320px] mx-auto text-center space-y-2 border-b border-black pb-2">
          <h2 className="font-extrabold text-sm uppercase">{companyName}</h2>
          {companyRuc && <p className="font-bold">{companyRuc}</p>}
          {company?.address && <p className="text-[10px]">{company.address}</p>}
          <p className="font-bold text-xs uppercase mt-2">=== CIERRE DE CAJA / ARQUEO ===</p>
          <div className="text-[10px] text-left pt-1">
            <p>Fecha Cierre: {selectedDate} {new Date().toLocaleTimeString('es-PE')}</p>
            <p>Operador / Cajero: {cashierName}</p>
          </div>
        </div>

        <div className="max-w-[320px] mx-auto py-2 border-b border-black space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Ventas Totales:</span>
            <span className="font-bold">{breakdown.salesCount} ops</span>
          </div>
          <div className="flex justify-between">
            <span>Total Facturado:</span>
            <span className="font-bold">{fmtMoney(breakdown.totalFacturado)}</span>
          </div>
        </div>

        <div className="max-w-[320px] mx-auto py-2 border-b border-black space-y-1 text-[11px]">
          <p className="font-bold uppercase text-[10px] mb-1">--- DESGLOSE POR MEDIO DE PAGO ---</p>
          <div className="flex justify-between">
            <span>Efectivo ({breakdown.efectivoCount}):</span>
            <span className="font-bold">{fmtMoney(breakdown.efectivo)}</span>
          </div>
          <div className="flex justify-between">
            <span>Yape ({breakdown.yapeCount}):</span>
            <span className="font-bold">{fmtMoney(breakdown.yape)}</span>
          </div>
          <div className="flex justify-between">
            <span>Plin ({breakdown.plinCount}):</span>
            <span className="font-bold">{fmtMoney(breakdown.plin)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transferencias:</span>
            <span className="font-bold">{fmtMoney(breakdown.transfer)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tarjeta / POS:</span>
            <span className="font-bold">{fmtMoney(breakdown.pos)}</span>
          </div>
          {breakdown.credito > 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Créditos (Pend.):</span>
              <span className="font-bold">{fmtMoney(breakdown.credito)}</span>
            </div>
          )}
        </div>

        <div className="max-w-[320px] mx-auto py-2 border-b border-black space-y-1 text-xs">
          <p className="font-bold uppercase text-[10px] mb-1">--- AUDITORÍA DE CAJA FÍSICA ---</p>
          <div className="flex justify-between">
            <span>Fondo Inicial:</span>
            <span>{fmtMoney(aperturaNum)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ventas Efectivo:</span>
            <span>+{fmtMoney(breakdown.efectivo)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Efectivo Esperado:</span>
            <span>{fmtMoney(expectedCash)}</span>
          </div>
          {countedNum !== null && (
            <>
              <div className="flex justify-between">
                <span>Efectivo Contado:</span>
                <span>{fmtMoney(countedNum)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-black">
                <span>Diferencia:</span>
                <span>{difference >= 0 ? `+${fmtMoney(difference)}` : fmtMoney(difference)}</span>
              </div>
            </>
          )}
        </div>

        {notes && (
          <div className="max-w-[320px] mx-auto py-2 border-b border-black text-[10px]">
            <p className="font-bold">Observaciones:</p>
            <p>{notes}</p>
          </div>
        )}

        <div className="max-w-[320px] mx-auto pt-6 text-center text-[10px] space-y-6">
          <div className="flex justify-between gap-4">
            <div className="flex-1 border-t border-black pt-1">
              <p className="font-bold">Firma Cajero</p>
              <p>{cashierName}</p>
            </div>
            <div className="flex-1 border-t border-black pt-1">
              <p className="font-bold">Firma Supervisor</p>
              <p>Auditoría / V°B°</p>
            </div>
          </div>
          <p className="text-[9px]">ERP CLEANIG SERVICE • SISTEMA DE GESTIÓN PRO</p>
        </div>
      </div>
    </div>
  )
}
