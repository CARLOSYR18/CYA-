import { forwardRef, useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Check, Copy, MessageCircle, Loader2, ShieldCheck, QrCode } from 'lucide-react'
import { shareReceiptAsImage } from '../lib/shareReceipt'
import { companySettingsService } from '../services/companySettingsService'
import { numberToWordsPE } from '../utils/numberToWords'
import { QrCodeSvg } from '../utils/qrCode'

const money = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Extrae y limpia inteligentemente DNI / RUC y teléfono si vienen mezclados en un string.
 */
function parseClientInfo(client, sale) {
  const rawName = client?.name || sale?.client_name || 'CLIENTE PARTICULAR'
  const rawPhone = client?.phone || sale?.client_phone || ''
  const rawDoc = client?.ruc || client?.dni || client?.document_number || sale?.client_document || ''

  let doc = rawDoc
  let phone = rawPhone

  const combined = `${rawDoc} ${rawPhone}`
  const docMatch = combined.match(/\b(dni|ruc|doc)?\s*:?\s*(\d{8,11})\b/i) || combined.match(/\b(\d{8}|\d{11})\b/)
  const phoneMatch = combined.match(/\b(tel|telf|cel|telefono|celular)?\s*:?\s*(9\d{8})\b/i)

  if (!doc && docMatch) {
    doc = docMatch[2] || docMatch[1]
  }
  if (phoneMatch) {
    phone = phoneMatch[2]
  } else if (rawPhone && rawPhone.toLowerCase().includes('dni')) {
    const digits = rawPhone.match(/\d+/g) || []
    if (digits.length >= 2) {
      phone = digits[0]
      if (!doc) doc = digits[1]
    } else if (digits.length === 1 && !doc) {
      doc = digits[0]
      phone = ''
    }
  }

  return {
    name: rawName.trim().toUpperCase(),
    document: doc || '—',
    phone: phone || ''
  }
}

const TicketBody = forwardRef(function TicketBody({ sale, client, products, company }, ref) {
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    setLogoError(false)
  }, [company?.logo_url])

  const productName = (id) => products?.find((p) => p.id === id)?.name || id
  const safeItems = Array.isArray(sale?.items)
    ? sale.items
    : typeof sale?.items === 'string'
    ? (() => { try { return JSON.parse(sale.items) } catch { return [] } })()
    : []

  const subtotal = safeItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  )
  const discount = Number(sale?.discount || 0)
  const total = Math.max(subtotal - discount, 0)
  const isAnulado = sale?.status === 'anulado'

  // Cálculos tributarios estándar SUNAT (IGV 18% incluido)
  const opGravada = Number((total / 1.18).toFixed(2))
  const igv = Number((total - opGravada).toFixed(2))

  const voucherType = sale?.receipt_type === 'factura'
    ? 'factura'
    : sale?.receipt_type === 'nota'
    ? 'nota'
    : 'boleta'

  const voucherTitle = voucherType === 'factura'
    ? 'Factura Electrónica'
    : voucherType === 'nota'
    ? 'Nota de Venta'
    : 'Boleta de Venta Electrónica'

  const serialPrefix = voucherType === 'factura'
    ? 'F001'
    : voucherType === 'nota'
    ? 'NV01'
    : 'B001'

  const rawCorrelative = sale?.id ? String(sale.id).replace(/\D/g, '').slice(-6).padStart(6, '0') : '000001'
  const ticketCode = sale?.invoice_number || `${serialPrefix}-${rawCorrelative}`

  const clientInfo = useMemo(() => parseClientInfo(client, sale), [client, sale])
  const companyDisplayName = company?.name || 'CLEANIG SERVICE'
  const companyRuc = company?.ruc || '20608218128'
  const companyAddress = company?.address || 'Lima, Perú'
  const companyPhone = company?.phone || ''

  // Generar cadena oficial SUNAT para el Código QR
  // Formato: RUC | TIPO_COMP | SERIE | CORRELATIVO | IGV | TOTAL | FECHA | TIPO_DOC_CLIENTE | NUM_DOC_CLIENTE
  const sunatQrString = useMemo(() => {
    const tipoComp = voucherType === 'factura' ? '01' : voucherType === 'boleta' ? '03' : '00'
    const fecha = sale?.created_at ? sale.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
    const tipoDoc = clientInfo.document.length === 11 ? '6' : clientInfo.document.length === 8 ? '1' : '-'
    return `${companyRuc}|${tipoComp}|${serialPrefix}|${rawCorrelative}|${igv}|${total.toFixed(2)}|${fecha}|${tipoDoc}|${clientInfo.document}|`
  }, [companyRuc, voucherType, serialPrefix, rawCorrelative, igv, total, sale, clientInfo])

  // Código Hash simulado para rigor tributario
  const hashDigest = useMemo(() => {
    const raw = `${ticketCode}-${total}-${sunatQrString}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '=='
  }, [ticketCode, total, sunatQrString])

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 font-sans p-6 rounded-3xl border border-slate-300 shadow-xl shadow-slate-200/50 max-w-[340px] sm:max-w-[355px] mx-auto text-xs leading-relaxed select-text relative"
    >
      {/* ─── Marca de Agua en Caso de Venta Anulada ─── */}
      {isAnulado && (
        <div className="mb-3.5 p-2.5 rounded-2xl bg-rose-50 border-2 border-dashed border-rose-500 text-center">
          <p className="text-rose-700 font-black tracking-widest text-xs uppercase">
            *** COMPROBANTE ANULADO ***
          </p>
          <p className="text-rose-600 font-bold text-[9px] mt-0.5">
            SIN VALOR COMERCIAL NI FISCAL • STOCK REINGRESADO
          </p>
        </div>
      )}

      {/* ─── Encabezado de Empresa ─── */}
      <div className="text-center pb-3 space-y-1">
        {company?.logo_url && !logoError ? (
          <div className="min-h-[46px] max-h-16 max-w-[200px] mx-auto mb-2 flex items-center justify-center">
            <img
              src={company.logo_url}
              alt={companyDisplayName}
              className="max-h-16 max-w-full w-auto h-auto object-contain"
              crossOrigin="anonymous"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tight mx-auto mb-2 shadow-sm">
            {companyDisplayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <h3 className="font-black text-sm tracking-tight text-slate-900 uppercase leading-snug">
          {companyDisplayName}
        </h3>
        
        <p className="text-[10px] text-slate-500 leading-tight">
          {companyAddress}
        </p>

        {companyPhone && (
          <p className="text-[10px] text-slate-600 font-mono font-medium">
            Telf: {companyPhone}
          </p>
        )}
      </div>

      {/* ─── Recuadro Oficial SUNAT (Borde formal clásico de facturación) ─── */}
      <div className="my-2.5 py-2.5 px-3 border-2 border-slate-900 rounded-xl text-center bg-slate-50/50">
        <p className="font-mono text-xs font-black text-slate-900 tracking-wider">
          R.U.C. N° {companyRuc}
        </p>
        <p className="font-black text-[11px] uppercase text-slate-900 tracking-wide my-0.5">
          {voucherTitle}
        </p>
        <p className="font-mono font-black text-sm text-slate-900 tracking-widest">
          {ticketCode}
        </p>
      </div>

      {/* ─── Metadatos de la Transacción (Alineación Formal de 2 Columnas) ─── */}
      <div className="space-y-1 text-[11px] py-2.5 border-t border-b border-dashed border-slate-300">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Fecha / Hora:</span>
          <span className="text-slate-800 font-mono font-semibold text-[11px]">
            {sale?.created_at
              ? new Date(sale.created_at).toLocaleString('es-PE', {
                  dateStyle: 'short',
                  timeStyle: 'medium'
                })
              : new Date().toLocaleString('es-PE', {
                  dateStyle: 'short',
                  timeStyle: 'medium'
                })}
          </span>
        </div>

        <div className="flex justify-between items-baseline gap-2">
          <span className="text-slate-500 font-bold uppercase text-[10px] shrink-0">Señor(es):</span>
          <span className="text-slate-900 font-bold truncate max-w-[210px] text-right uppercase">
            {clientInfo.name}
          </span>
        </div>

        {clientInfo.document !== '—' && (
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 font-bold uppercase text-[10px]">
              {clientInfo.document.length === 11 ? 'R.U.C.:' : 'D.N.I.:'}
            </span>
            <span className="text-slate-900 font-mono font-bold tracking-wider">
              {clientInfo.document}
            </span>
          </div>
        )}

        {clientInfo.phone && (
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Teléfono:</span>
            <span className="text-slate-700 font-mono font-medium">
              {clientInfo.phone}
            </span>
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Forma de Pago:</span>
          <span className="font-bold font-mono text-[10px] text-slate-800 uppercase">
            {sale?.payment_method ? sale.payment_method.toUpperCase() : 'AL CONTADO'}
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-bold uppercase text-[10px]">Moneda:</span>
          <span className="font-bold text-[10px] text-slate-800 uppercase font-mono">
            SOLES (PEN - S/)
          </span>
        </div>
      </div>

      {/* ─── Tabla de Ítems / Productos ─── */}
      <div className="py-2.5 border-b border-dashed border-slate-300">
        <div className="grid grid-cols-12 text-[10px] font-black text-slate-700 uppercase tracking-wider pb-1.5 mb-1.5 border-b border-slate-200">
          <span className="col-span-2 text-center">Cant</span>
          <span className="col-span-6">Descripción</span>
          <span className="col-span-4 text-right">Total</span>
        </div>

        <div className="space-y-2">
          {safeItems.map((it, i) => {
            const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_price) || 0)
            return (
              <div key={i} className="grid grid-cols-12 text-[11px] items-start gap-1 py-0.5">
                <span className="col-span-2 text-center font-mono font-black text-slate-900">
                  {it.quantity}
                </span>
                <div className="col-span-6 min-w-0 pr-1">
                  <p className="font-bold text-slate-900 leading-tight uppercase text-[11px]">
                    {productName(it.product_id)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    x {money(it.unit_price)}
                  </p>
                </div>
                <span className="col-span-4 text-right font-mono font-black text-slate-900">
                  {money(itemTotal)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Liquidación y Totales Oficiales ─── */}
      <div className="py-2.5 space-y-1.5 text-xs border-b border-dashed border-slate-300">
        <div className="flex justify-between text-slate-600 font-medium">
          <span>OP. GRAVADA:</span>
          <span className="font-mono text-slate-800">{money(opGravada)}</span>
        </div>
        <div className="flex justify-between text-slate-600 font-medium">
          <span>I.G.V. (18%):</span>
          <span className="font-mono text-slate-800">{money(igv)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-rose-600 font-semibold">
            <span>DESCUENTO TOTAL:</span>
            <span className="font-mono">-{money(discount)}</span>
          </div>
        )}

        {/* Recuadro de Total a Pagar */}
        <div className="flex justify-between items-center py-2 px-3 bg-slate-900 text-white rounded-xl mt-2 shadow-xs">
          <span className="text-xs uppercase font-extrabold tracking-wider">TOTAL A PAGAR:</span>
          <span className="text-base font-mono font-black">{money(total)}</span>
        </div>

        {/* Importe Legal en Letras */}
        <p className="text-[9px] font-mono font-bold text-slate-600 text-center uppercase tracking-tight pt-1 leading-tight">
          {numberToWordsPE(total)}
        </p>
      </div>

      {/* ─── Código QR Bidimensional Oficial & Datos de Seguridad ─── */}
      <div className="pt-3 text-center space-y-2">
        <div className="flex items-center justify-center p-2 bg-white rounded-xl border border-slate-200 w-fit mx-auto shadow-xs">
          <QrCodeSvg value={sunatQrString} size={110} />
        </div>

        <div className="text-[9px] font-mono text-slate-500 leading-tight space-y-0.5">
          <p className="font-bold text-slate-700">Código Hash: {hashDigest}</p>
          <p>Representación impresa de la {voucherTitle.toUpperCase()}</p>
          <p>Consulte su validez en: <span className="underline">www.sunat.gob.pe</span></p>
        </div>

        {/* Mensaje de Garantía / Pie de Página */}
        <div className="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
          <p className="text-[11px] font-bold text-slate-800 whitespace-pre-line leading-tight">
            {company?.footer_message || '¡Gracias por su preferencia!\nConserve su comprobante para cualquier cambio o garantía.'}
          </p>
          <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest pt-1">
            SISTEMA POS PRO • ERP CLEANIG SERVICE
          </p>
        </div>
      </div>

    </div>
  )
})

export default function Receipt({ sale, client, products, company: propCompany }) {
  const [company, setCompany] = useState(() => propCompany || companySettingsService.getCached?.() || null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const visibleTicketRef = useRef(null)

  useEffect(() => {
    if (propCompany) {
      setCompany(propCompany)
    } else {
      companySettingsService.get().then(setCompany).catch(() => {})
    }
  }, [propCompany])

  const productName = (id) => products?.find((p) => p.id === id)?.name || id
  const safeItems = Array.isArray(sale?.items)
    ? sale.items
    : typeof sale?.items === 'string'
    ? (() => { try { return JSON.parse(sale.items) } catch { return [] } })()
    : []
  const subtotal = safeItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  )
  const discount = Number(sale?.discount || 0)
  const total = Math.max(subtotal - discount, 0)
  const rawCorrelative = sale?.id ? String(sale.id).replace(/\D/g, '').slice(-6).padStart(6, '0') : '000001'
  const ticketCode = sale?.invoice_number || `B001-${rawCorrelative}`
  const clientInfo = parseClientInfo(client, sale)
  const companyDisplayName = company?.name || 'CLEANIG SERVICE'

  const shareText = `*${companyDisplayName}* 🧾
*Comprobante:* ${ticketCode}
*Cliente:* ${clientInfo.name}
${clientInfo.document !== '—' ? `*DNI/RUC:* ${clientInfo.document}\n` : ''}*Fecha:* ${sale?.created_at ? new Date(sale.created_at).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE')}
-----------------------------
${safeItems.map((it) => `• ${it.quantity}x ${productName(it.product_id)} = ${money((it.quantity || 1) * (it.unit_price || 0))}`).join('\n')}
-----------------------------
*TOTAL A PAGAR: ${money(total)}*
${numberToWordsPE(total)}
¡Gracias por su compra!`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = async () => {
    if (!visibleTicketRef.current || sharing) return
    setSharing(true)
    try {
      const fileName = `comprobante-${ticketCode}.png`
      const whatsappText = `Hola ${clientInfo.name}, adjuntamos tu ${ticketCode} emitido por ${companyDisplayName} por un total de S/ ${total.toFixed(2)}. ¡Muchas gracias por tu preferencia!`
      const phone = clientInfo.phone || undefined

      await shareReceiptAsImage(visibleTicketRef.current, {
        fileName,
        whatsappText,
        phone,
      })
    } catch (err) {
      console.error('Error al compartir comprobante como imagen:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Visual Ticket Body (Visible en el modal para html2canvas y visualización en vivo) */}
      <div className="overflow-y-auto max-h-[68vh] p-2 flex justify-center bg-slate-100/70 dark:bg-zinc-950/50 rounded-2xl">
        <TicketBody
          ref={visibleTicketRef}
          sale={sale}
          client={client}
          products={products}
          company={company}
        />
      </div>

      {/* Print Portal */}
      {createPortal(
        <div id="receipt-print-area">
          <TicketBody
            sale={sale}
            client={client}
            products={products}
            company={company}
          />
        </div>,
        document.body
      )}

      {/* Action Buttons: Imprimir + WhatsApp + Copiar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition-all shadow-sm cursor-pointer"
        >
          <Printer size={15} />
          <span>Imprimir (80mm)</span>
        </button>

        <button
          type="button"
          disabled={sharing}
          onClick={handleWhatsApp}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition-all shadow-sm cursor-pointer"
        >
          {sharing ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Generando imagen…</span>
            </>
          ) : (
            <>
              <MessageCircle size={15} />
              <span>Enviar WhatsApp</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 text-slate-700 dark:text-zinc-200 font-bold text-xs py-2.5 px-3 rounded-2xl transition-all shadow-xs cursor-pointer"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
        </button>
      </div>
    </div>
  )
}
