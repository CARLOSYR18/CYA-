import { forwardRef, useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Check, Copy, MessageCircle, Loader2 } from 'lucide-react'
import { shareReceiptAsImage } from '../lib/shareReceipt'
import { companySettingsService } from '../services/companySettingsService'
import { numberToWordsPE } from '../utils/numberToWords'
import { QrCodeSvg } from '../utils/qrCode'

const money = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Limpia y separa de forma inteligente DNI/RUC y teléfono en caso vengan mezclados en un string.
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
  } else if (rawPhone && !rawPhone.toLowerCase().includes('dni')) {
    phone = rawPhone
  } else if (rawPhone && rawPhone.toLowerCase().includes('dni') && !phoneMatch) {
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

  const rawType = (sale?.receipt_type || '').toLowerCase()
  const isFactura = rawType === 'factura'
  const isNota = rawType === 'nota'

  const voucherTitle = isFactura
    ? 'FACTURA ELECTRÓNICA'
    : isNota
    ? 'NOTA DE VENTA / TICKET'
    : 'BOLETA DE VENTA ELECTRÓNICA'

  const serialPrefix = isFactura ? 'F001' : isNota ? 'NV01' : 'B001'
  const rawCorrelative = sale?.id ? String(sale.id).replace(/\D/g, '').slice(-6).padStart(6, '0') : '000001'
  const ticketCode = sale?.invoice_number || `${serialPrefix}-${rawCorrelative}`

  const clientInfo = useMemo(() => parseClientInfo(client, sale), [client, sale])
  const companyDisplayName = company?.name || 'CLEANIG SERVICE'
  const companyRuc = company?.ruc || '20608218128'
  const companyAddress = company?.address || 'Lima, Perú'
  const companyPhone = company?.phone || ''

  // Formato oficial SUNAT para el Código QR (RUC|TIPO|SERIE|CORRELATIVO|IGV|TOTAL|FECHA|TIPO_DOC|NUM_DOC)
  const sunatQrString = useMemo(() => {
    const tipoComp = isFactura ? '01' : isNota ? '00' : '03'
    const fecha = sale?.created_at ? sale.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
    const tipoDoc = clientInfo.document.length === 11 ? '6' : clientInfo.document.length === 8 ? '1' : '-'
    return `${companyRuc}|${tipoComp}|${serialPrefix}|${rawCorrelative}|${igv}|${total.toFixed(2)}|${fecha}|${tipoDoc}|${clientInfo.document}|`
  }, [companyRuc, isFactura, isNota, serialPrefix, rawCorrelative, igv, total, sale, clientInfo])

  // Código Hash representativo de seguridad
  const hashDigest = useMemo(() => {
    const raw = `${ticketCode}-${total}-${sunatQrString}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '=='
  }, [ticketCode, total, sunatQrString])

  const formattedDate = useMemo(() => {
    if (!sale?.created_at) return new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
    const d = new Date(sale.created_at)
    return isNaN(d.getTime())
      ? String(sale.created_at)
      : d.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
  }, [sale?.created_at])

  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 font-sans p-5 sm:p-6 rounded-sm shadow-md border border-slate-200/90 w-[305px] sm:w-[325px] mx-auto text-[11px] leading-tight select-text relative"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      {/* ─── Marca de Agua en Caso de Venta Anulada ─── */}
      {isAnulado && (
        <div className="mb-2.5 p-1.5 border border-dashed border-rose-500 bg-rose-50/80 text-center rounded">
          <p className="text-rose-700 font-mono font-bold tracking-wider text-[10px] uppercase">
            *** ANULADO - SIN VALOR FISCAL ***
          </p>
          <p className="text-rose-600 font-mono text-[8px] mt-0.5">
            STOCK DEVUELTO AL ALMACÉN
          </p>
        </div>
      )}

      {/* ─── Encabezado de Empresa (Limpio y Compacto) ─── */}
      <div className="text-center pb-2">
        {company?.logo_url && !logoError ? (
          <div className="h-10 max-w-[150px] mx-auto mb-1.5 flex items-center justify-center">
            <img
              src={company.logo_url}
              alt={companyDisplayName}
              className="max-h-10 max-w-full w-auto h-auto object-contain"
              crossOrigin="anonymous"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs mx-auto mb-1.5">
            {companyDisplayName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <h2 className="font-black text-[13px] text-slate-900 uppercase tracking-tight leading-snug">
          {companyDisplayName}
        </h2>

        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
          {companyAddress}
        </p>

        {companyPhone && (
          <p className="text-[10px] font-mono text-slate-600 mt-0.5">
            Telf: {companyPhone}
          </p>
        )}
      </div>

      {/* ─── Recuadro Legal SUNAT (Borde fino de 1px) ─── */}
      <div className="my-2 py-1.5 px-2 border border-slate-800 rounded text-center">
        <p className="font-mono text-[10.5px] font-bold text-slate-900 tracking-wider">
          R.U.C. N° {companyRuc}
        </p>
        <p className="font-extrabold text-[10.5px] uppercase text-slate-900 tracking-wide mt-0.5">
          {voucherTitle}
        </p>
        <p className="font-mono font-black text-[12px] text-slate-900 tracking-widest mt-0.5">
          {ticketCode}
        </p>
      </div>

      {/* ─── Datos de Emisión y Cliente (Alineación Limpia) ─── */}
      <div className="border-t border-b border-dashed border-slate-300 py-1.5 my-1.5 space-y-1 text-[10.5px]">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-semibold text-[10px]">FECHA:</span>
          <span className="font-mono font-bold text-slate-800">{formattedDate}</span>
        </div>

        <div className="flex justify-between items-baseline gap-1">
          <span className="text-slate-500 font-semibold text-[10px] shrink-0">CLIENTE:</span>
          <span className="font-bold text-slate-900 text-right truncate max-w-[200px] uppercase">
            {clientInfo.name}
          </span>
        </div>

        {clientInfo.document !== '—' && (
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 font-semibold text-[10px]">
              {clientInfo.document.length === 11 ? 'R.U.C.:' : 'D.N.I.:'}
            </span>
            <span className="font-mono font-bold text-slate-900">{clientInfo.document}</span>
          </div>
        )}

        {clientInfo.phone && (
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 font-semibold text-[10px]">TELÉFONO:</span>
            <span className="font-mono text-slate-700">{clientInfo.phone}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-semibold text-[10px]">PAGO:</span>
          <span className="font-mono font-bold text-slate-800 uppercase">
            {sale?.payment_method ? sale.payment_method.toUpperCase() : 'EFECTIVO'} • AL CONTADO
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-slate-500 font-semibold text-[10px]">MONEDA:</span>
          <span className="font-mono font-bold text-slate-800">SOLES (S/)</span>
        </div>
      </div>

      {/* ─── Tabla de Ítems (Estilo Ticket Térmico POS Clásico) ─── */}
      <div className="py-1">
        <div className="flex justify-between text-[10px] font-bold text-slate-600 uppercase pb-1 border-b border-dashed border-slate-300">
          <span>[CANT] DESCRIPCIÓN</span>
          <span>IMPORTE</span>
        </div>

        <div className="divide-y divide-dotted divide-slate-200">
          {safeItems.map((it, i) => {
            const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_price) || 0)
            return (
              <div key={i} className="py-1 text-[10.5px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 leading-tight uppercase pr-2">
                    {it.quantity} x {productName(it.product_id)}
                  </span>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {money(itemTotal)}
                  </span>
                </div>
                <div className="text-[9.5px] font-mono text-slate-500 pl-4">
                  P.Unit: {money(it.unit_price)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Liquidación y Totales Oficiales ─── */}
      <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-0.5 text-[10.5px]">
        <div className="flex justify-between text-slate-600">
          <span>OP. GRAVADA:</span>
          <span className="font-mono font-medium text-slate-800">{money(opGravada)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>I.G.V. (18%):</span>
          <span className="font-mono font-medium text-slate-800">{money(igv)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-rose-600">
            <span>DESCUENTO:</span>
            <span className="font-mono font-medium">-{money(discount)}</span>
          </div>
        )}

        {/* Línea Principal de Total a Pagar */}
        <div className="border-t-2 border-b-2 border-slate-900 py-1 my-1 flex justify-between items-baseline font-black">
          <span className="text-[11px] uppercase tracking-wider">TOTAL A PAGAR:</span>
          <span className="font-mono text-sm tracking-tight">{money(total)}</span>
        </div>

        {/* Importe en Letras Legal */}
        <p className="text-[8.5px] font-mono font-medium text-slate-600 uppercase text-center leading-tight pt-0.5">
          {numberToWordsPE(total)}
        </p>
      </div>

      {/* ─── Código QR Bidimensional & Seguridad SUNAT ─── */}
      <div className="pt-2 text-center space-y-1">
        <div className="flex justify-center my-1">
          <QrCodeSvg value={sunatQrString} size={82} />
        </div>

        <p className="font-mono text-[8px] text-slate-500 leading-tight">
          Código Hash: {hashDigest}
        </p>
        <p className="font-mono text-[8px] text-slate-500 leading-tight">
          Representación impresa de la {voucherTitle}
        </p>
        <p className="font-mono text-[8px] text-slate-400 leading-tight">
          Consulte su comprobante en www.sunat.gob.pe
        </p>
      </div>

      {/* ─── Mensaje de Pie / Garantía ─── */}
      <div className="border-t border-dashed border-slate-300 pt-2 mt-2 text-center space-y-0.5">
        <p className="font-bold text-[10px] text-slate-800 whitespace-pre-line leading-tight">
          {company?.footer_message || '¡Gracias por su compra!\nConserve su comprobante para cualquier cambio o garantía.'}
        </p>
        <p className="font-mono text-[8px] text-slate-400 tracking-wider pt-0.5">
          SISTEMA POS PRO • ERP
        </p>
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

  const isFactura = (sale?.receipt_type || '').toLowerCase() === 'factura'
  const isNota = (sale?.receipt_type || '').toLowerCase() === 'nota'
  const serialPrefix = isFactura ? 'F001' : isNota ? 'NV01' : 'B001'
  const rawCorrelative = sale?.id ? String(sale.id).replace(/\D/g, '').slice(-6).padStart(6, '0') : '000001'
  const ticketCode = sale?.invoice_number || `${serialPrefix}-${rawCorrelative}`

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
      const whatsappText = `Hola ${clientInfo.name}, adjuntamos tu comprobante ${ticketCode} emitido por ${companyDisplayName} por un total de S/ ${total.toFixed(2)}. ¡Muchas gracias por tu preferencia!`
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
    <div className="space-y-3">
      {/* Visual Ticket Body: Fondo neutro suave sin bordes duplicados ni recortes */}
      <div className="overflow-y-auto max-h-[70vh] p-2 sm:p-3 flex justify-center bg-slate-100/80 dark:bg-zinc-950/60 rounded-xl">
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
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Printer size={15} />
          <span>Imprimir (80mm)</span>
        </button>

        <button
          type="button"
          disabled={sharing}
          onClick={handleWhatsApp}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
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
          className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 active:scale-95 text-slate-700 dark:text-zinc-200 font-bold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
        </button>
      </div>
    </div>
  )
}
