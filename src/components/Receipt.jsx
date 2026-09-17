import { createPortal } from 'react-dom'
import { Printer, Share2, Check, Copy, MessageCircle } from 'lucide-react'
import { useState } from 'react'

const money = (n) =>
  `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function TicketBody({ sale, client, products, company }) {
  const productName = (id) => products.find((p) => p.id === id)?.name || id
  const productSku = (id) => products.find((p) => p.id === id)?.sku || ''
  const subtotal = sale.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  )
  const discount = Number(sale.discount || 0)
  const total = Math.max(subtotal - discount, 0)
  const ticketCode = `B001-${sale.id ? sale.id.toString().slice(-6).toUpperCase() : '000001'}`

  const clientName = client?.name || sale.client_name || 'CLIENTE PARTICULAR'
  const clientPhone = client?.phone || sale.client_phone || ''

  return (
    <div className="bg-white text-slate-900 font-sans p-6 rounded-2xl border border-slate-200/90 shadow-sm max-w-[340px] mx-auto text-xs leading-relaxed select-text">
      
      {/* ─── Company Header ─── */}
      <div className="text-center pb-3 border-b border-dashed border-slate-300">
        {company?.logo_url ? (
          <img
            src={company.logo_url}
            alt="Logo"
            className="w-14 h-14 mx-auto mb-2 object-contain rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm font-display shadow-xs">
            {company?.name ? company.name.slice(0, 2).toUpperCase() : 'CYA'}
          </div>
        )}
        <h3 className="font-extrabold text-sm tracking-tight text-slate-900 uppercase">
          {company?.name || 'CYA STORE'}
        </h3>
        {company?.ruc && (
          <p className="font-mono text-[11px] font-bold text-slate-700 mt-0.5">
            R.U.C. {company.ruc}
          </p>
        )}
        {company?.address && (
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
            {company.address}
          </p>
        )}
        {company?.phone && (
          <p className="text-[10px] text-slate-500 font-mono">
            Telf: {company.phone}
          </p>
        )}
      </div>

      {/* ─── Boleta Badge & Correlative ─── */}
      <div className="my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
          Boleta de Venta
        </p>
        <p className="font-mono font-extrabold text-sm text-slate-900 mt-0.5 tracking-wider">
          {ticketCode}
        </p>
      </div>

      {/* ─── Transaction Meta ─── */}
      <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400 font-medium">Fecha:</span>
          <span className="text-slate-700 font-medium font-mono">
            {new Date(sale.created_at).toLocaleString('es-PE', {
              dateStyle: 'short',
              timeStyle: 'short'
            })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-medium">Cliente:</span>
          <span className="text-slate-900 font-bold truncate max-w-[190px] text-right">
            {clientName}
          </span>
        </div>
        {clientPhone && (
          <div className="flex justify-between">
            <span className="text-slate-400 font-medium">Contacto:</span>
            <span className="text-slate-700 font-mono">{clientPhone}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-400 font-medium">Condición:</span>
          <span className="font-semibold text-emerald-700 uppercase text-[10px]">
            {sale.status === 'pagado' ? 'Al Contado • Pagado' : 'Crédito • Pendiente'}
          </span>
        </div>
      </div>

      {/* ─── Items Table ─── */}
      <div className="py-3 border-b border-dashed border-slate-300">
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 mb-1.5 border-b border-slate-100">
          <span className="col-span-2">Cant</span>
          <span className="col-span-6">Descripción</span>
          <span className="col-span-4 text-right">Total</span>
        </div>

        <div className="space-y-2">
          {sale.items.map((it, i) => {
            const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_price) || 0)
            const sku = productSku(it.product_id)
            return (
              <div key={i} className="grid grid-cols-12 text-[11px] items-start gap-1">
                <span className="col-span-2 font-mono font-bold text-slate-700">
                  {it.quantity}x
                </span>
                <div className="col-span-6 min-w-0 pr-1">
                  <p className="font-semibold text-slate-900 leading-tight">
                    {productName(it.product_id)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {money(it.unit_price)} c/u
                  </p>
                </div>
                <span className="col-span-4 text-right font-mono font-bold text-slate-900">
                  {money(itemTotal)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Financial Totals ─── */}
      <div className="py-3 space-y-1 text-xs border-b border-dashed border-slate-300">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal:</span>
          <span className="font-mono text-slate-700">{money(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-amber-600 font-medium">
            <span>Descuento aplicado:</span>
            <span className="font-mono">-{money(discount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm font-extrabold pt-2 mt-1 border-t border-slate-100 text-slate-900">
          <span className="text-xs uppercase tracking-wider">TOTAL A PAGAR:</span>
          <span className="text-base font-mono text-brand font-black">{money(total)}</span>
        </div>
      </div>

      {/* ─── Decorative Barcode & Footer ─── */}
      <div className="pt-3 text-center space-y-2">
        {/* Synthetic Vector Barcode */}
        <div className="flex items-center justify-center gap-0.5 h-7 opacity-75">
          {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2].map((w, idx) => (
            <span
              key={idx}
              className="bg-slate-800 h-full rounded-[1px]"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
        <p className="font-mono text-[9px] text-slate-400 tracking-widest">{ticketCode}</p>

        <p className="text-[11px] font-semibold text-slate-700">
          ¡Gracias por su preferencia!
        </p>
        <p className="text-[10px] text-slate-400">
          Comprobante emitido electrónicamente por el sistema ERP
        </p>
      </div>

    </div>
  )
}

export default function Receipt({ sale, client, products, company }) {
  const [copied, setCopied] = useState(false)

  const productName = (id) => products.find((p) => p.id === id)?.name || id
  const subtotal = sale.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    0
  )
  const discount = Number(sale.discount || 0)
  const total = Math.max(subtotal - discount, 0)
  const ticketCode = `B001-${sale.id ? sale.id.toString().slice(-6).toUpperCase() : '000001'}`
  const clientName = client?.name || sale.client_name || 'Cliente'

  const shareText = `*${company?.name || 'CYA STORE'}* 🧾
*Comprobante:* ${ticketCode}
*Cliente:* ${clientName}
*Fecha:* ${new Date(sale.created_at).toLocaleDateString('es-PE')}
-----------------------------
${sale.items.map((it) => `• ${it.quantity}x ${productName(it.product_id)} = ${money((it.quantity || 1) * (it.unit_price || 0))}`).join('\n')}
-----------------------------
*TOTAL PAGADO: ${money(total)}*
¡Gracias por su compra!`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const phone = client?.phone || sale.client_phone || ''
    const cleanPhone = phone.replace(/\D/g, '')
    const url = cleanPhone
      ? `https://wa.me/51${cleanPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Visual Ticket Body */}
      <div className="overflow-y-auto max-h-[65vh] p-1">
        <TicketBody sale={sale} client={client} products={products} company={company} />
      </div>

      {/* Print Portal */}
      {createPortal(
        <div id="receipt-print-area">
          <TicketBody sale={sale} client={client} products={products} company={company} />
        </div>,
        document.body
      )}

      {/* Action Buttons: Imprimir + WhatsApp + Copiar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs"
        >
          <Printer size={15} />
          <span>Imprimir</span>
        </button>

        <button
          type="button"
          onClick={handleWhatsApp}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs"
        >
          <MessageCircle size={15} />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow-xs"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  )
}
