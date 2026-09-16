import { useEffect, useState } from 'react'
import { Users, Phone, ShoppingBag, Calendar, TrendingUp, ChevronRight } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import StatusBadge from '../components/ui/StatusBadge'
import { getClientsHistory } from '../lib/clientHistory'

const money = (n) => `S/ ${Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const dateStr = (iso) => iso ? new Date(iso).toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}) : '—'

const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
]

export default function Clients() {
  const [clients,setClients] = useState([])
  const [loading,setLoading] = useState(true)
  const [selected,setSelected] = useState(null)
  useEffect(()=>{getClientsHistory().then(setClients).finally(()=>setLoading(false))},[])

  return (
    <AppLayout title="Clientes">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5">
        <p className="text-sm text-ink-muted">Clientes registrados automáticamente al registrar ventas.</p>
        <span className="text-[11px] font-bold text-brand bg-blue-50 border border-blue-200 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
          {clients.length} cliente{clients.length!==1?'s':''}
        </span>
      </div>

      {loading
        ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
        :clients.length===0
        ?<div className="card"><EmptyState icon={Users} title="Sin historial de clientes" description="Los clientes aparecen aquí automáticamente cuando registras ventas."/></div>
        :(
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c,idx)=>(
            <button key={c.id} onClick={()=>setSelected(c)}
              className="card card-hover p-5 text-left group cursor-pointer w-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[idx%AVATAR_COLORS.length]} flex items-center justify-center shrink-0 shadow-xs`}>
                  <span className="text-white font-display font-bold text-lg leading-none">{c.name.charAt(0).toUpperCase()}</span>
                </div>
                <ChevronRight size={15} className="text-ink-muted group-hover:text-brand transition-colors mt-1"/>
              </div>
              <p className="font-semibold text-ink-primary text-[14px] leading-tight mb-1">{c.name}</p>
              {c.phone?<p className="flex items-center gap-1.5 text-[11px] text-ink-muted mb-4"><Phone size={11}/>{c.phone}</p>:<div className="mb-4"/>}
              <div className="grid grid-cols-3 gap-1 pt-3 border-t border-base-border">
                <div className="text-center min-w-0"><p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1 flex items-center justify-center gap-0.5"><ShoppingBag size={9}/> Compras</p><p className="font-bold text-ink-primary text-sm">{c.salesCount}</p></div>
                <div className="text-center min-w-0"><p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1 flex items-center justify-center gap-0.5"><TrendingUp size={9}/> Total</p><p className="font-bold text-brand text-[11px] sm:text-sm truncate">{money(c.totalSpent)}</p></div>
                <div className="text-center min-w-0"><p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1 flex items-center justify-center gap-0.5"><Calendar size={9}/> Última</p><p className="font-medium text-ink-secondary text-[10px] truncate">{dateStr(c.lastPurchase)}</p></div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={selected?`Historial — ${selected.name}`:''} width="max-w-2xl">
        {selected&&(
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 bg-base-raised rounded-xl px-4 py-3 text-sm border border-base-border">
              {selected.phone&&<span className="flex items-center gap-1.5 text-ink-secondary"><Phone size={13} className="text-ink-muted"/>{selected.phone}</span>}
              <span className="flex items-center gap-1.5 text-ink-secondary"><ShoppingBag size={13} className="text-ink-muted"/>{selected.salesCount} compra{selected.salesCount!==1?'s':''}</span>
              <span className="flex items-center gap-1.5 font-bold text-brand"><TrendingUp size={13}/>{money(selected.totalSpent)} en total</span>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selected.sales.map(sale=>(
                <div key={sale.id} className="border border-base-border rounded-xl overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 px-4 py-2.5 bg-base-raised border-b border-base-border/60">
                    <span className="text-[11px] text-ink-muted">{new Date(sale.created_at).toLocaleString('es-PE')}</span>
                    <div className="flex items-center gap-2.5"><StatusBadge status={sale.status}/><span className="font-mono font-bold text-[13px]">{money(sale.items.reduce((s,it)=>s+it.quantity*it.unit_price,0))}</span></div>
                  </div>
                  <div className="divide-y divide-base-border/40">
                    {sale.items.map((it,i)=>(
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5 text-sm">
                        <span className="text-ink-secondary font-medium text-[13px]">{it.product_name||it.product_id}</span>
                        <span className="font-mono text-ink-muted text-[12px]">{it.quantity} × {money(it.unit_price)} = <span className="text-ink-primary font-semibold">{money(it.quantity*it.unit_price)}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
