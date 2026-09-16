import { createPortal } from 'react-dom'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function TicketBody({ sale, client, products, company }) {
  const productName = (id) => products.find((p) => p.id === id)?.name || id
  const subtotal = sale.items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0)
  const discount = Number(sale.discount || 0)
  const total = Math.max(subtotal - discount, 0)

  return (
    <div className="ticket font-mono text-[13px] text-black bg-white w-[300px] mx-auto p-4">
      <div className="text-center mb-2">
        {company?.logo_url && (
          <img src={company.logo_url} alt="logo" className="w-12 h-12 mx-auto mb-1 object-contain" />
        )}
        <p className="font-bold text-sm uppercase">{company?.name || 'Mi Empresa'}</p>
        {company?.ruc && <p className="text-xs">RUC {company.ruc}</p>}
        {company?.address && <p className="text-xs">{company.address}</p>}
        {company?.phone && <p className="text-xs">{company.phone}</p>}
      </div>

      <div className="border-t border-dashed border-black my-2" />

      <div className="flex justify-between text-xs">
        <span>Boleta</span>
        <span>#{sale.id.toString().slice(0, 8).toUpperCase()}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Fecha</span>
        <span>{new Date(sale.created_at).toLocaleString('es-PE')}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Cliente</span>
        <span>{client?.name || 'Cliente no registrado'}</span>
      </div>
      {client?.phone && (
        <div className="flex justify-between text-xs">
          <span>Tel.</span>
          <span>{client.phone}</span>
        </div>
      )}

      <div className="border-t border-dashed border-black my-2" />

      <div className="text-xs font-bold flex justify-between mb-1">
        <span>PRODUCTO</span>
        <span>SUBTOTAL</span>
      </div>
      {sale.items.map((it, i) => (
        <div key={i} className="text-xs mb-1.5">
          <div>{productName(it.product_id)}</div>
          <div className="flex justify-between">
            <span>{it.quantity} x {money(it.unit_price)}</span>
            <span>{money(it.quantity * it.unit_price)}</span>
          </div>
        </div>
      ))}

      <div className="border-t border-dashed border-black my-2" />

      <div className="flex justify-between text-xs">
        <span>Subtotal</span>
        <span>{money(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-xs">
          <span>Descuento</span>
          <span>-{money(discount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-sm mt-1">
        <span>TOTAL</span>
        <span>{money(total)}</span>
      </div>

      <div className="border-t border-dashed border-black my-2" />

      <p className="text-center text-xs mt-2">¡Gracias por su compra!</p>
      <p className="text-center text-[10px] mt-0.5">{company?.name}</p>
    </div>
  )
}

// sale: la venta. client: objeto cliente completo ({ name, phone... }).
// products: lista de productos (para mostrar nombres). company: datos de
// companySettingsService.get().
export default function Receipt({ sale, client, products, company }) {
  return (
    <div>
      {/* Vista previa dentro del modal */}
      <TicketBody sale={sale} client={client} products={products} company={company} />

      {/* Copia inyectada directo en <body>, fuera del modal, para que la
          impresión no quede recortada por el scroll/overflow del modal. */}
      {createPortal(
        <div id="receipt-print-area">
          <TicketBody sale={sale} client={client} products={products} company={company} />
        </div>,
        document.body
      )}

      <button onClick={() => window.print()} className="btn-secondary w-full mt-4">
        Imprimir boleta
      </button>
    </div>
  )
}
