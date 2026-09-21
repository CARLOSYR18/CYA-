import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, UserCog, ShieldCheck, ToggleLeft, ToggleRight, Crown, ArrowRight, Sparkles } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { usersService } from '../services/usersService'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { companySettingsService } from '../services/companySettingsService'
import { getLimits } from '../lib/planLimits'

const emptyForm = {full_name:'',email:'',password:'',role:'empleado'}

export default function Users() {
  const [users,setUsers]         = useState([])
  const [loading,setLoading]     = useState(true)
  const [modalOpen,setModalOpen] = useState(false)
  const [limitModalOpen,setLimitModalOpen] = useState(false)
  const [limitMessage,setLimitMessage]     = useState('')
  const [editing,setEditing]     = useState(null)
  const [form,setForm]           = useState(emptyForm)
  const [error,setError]         = useState('')

  async function loadAll(){setLoading(true);setUsers(await usersService.list());setLoading(false)}
  useEffect(()=>{loadAll()},[])
  async function openCreate(){
    try {
      const company = await companySettingsService.get()
      const limits = getLimits(company)
      if (users.length >= limits.maxUsers) {
        setLimitMessage(`Alcanzaste el límite de tu plan Free (${limits.maxUsers} usuario). Actualiza a Pro para agregar más.`)
        setLimitModalOpen(true)
        return
      }
    } catch (e) {
      console.warn('Error verificando límites de usuarios:', e)
    }
    setEditing(null);setForm(emptyForm);setError('');setModalOpen(true)
  }
  function openEdit(u){setEditing(u);setForm({full_name:u.full_name,email:u.email,password:'',role:u.role});setError('');setModalOpen(true)}

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!form.full_name.trim()||!form.email.trim()){setError('Nombre y correo son obligatorios');return}
    if(!editing&&!isSupabaseConfigured&&!form.password.trim()){setError('La contraseña es obligatoria');return}
    try{
      if(editing){const patch={full_name:form.full_name,email:form.email,role:form.role};if(form.password.trim())patch.password=form.password;await usersService.update(editing.id,patch)}
      else{if(isSupabaseConfigured){setError('Con Supabase conectado, crea usuarios desde Authentication → Users.');return}await usersService.create({full_name:form.full_name,email:form.email,password:form.password,role:form.role,active:true})}
      setModalOpen(false);loadAll()
    }catch(err){setError(err.message)}
  }
  async function toggleActive(u){await usersService.update(u.id,{active:!u.active});loadAll()}

  return (
    <AppLayout title="Usuarios y roles">
      <div className="flex justify-end mb-5"><button onClick={openCreate} className="btn-primary w-full sm:w-auto justify-center"><Plus size={15}/> Nuevo usuario</button></div>
      <div className="card overflow-hidden">
        {loading
          ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
          :users.length===0
          ?<EmptyState icon={UserCog} title="Sin usuarios"/>
          :(
          <>
            <div className="block sm:hidden divide-y divide-base-border/60">
              {users.map(u=>(
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold text-[13px]">{u.full_name}</p><p className="text-[11px] text-ink-secondary">{u.email}</p></div>
                    <button onClick={()=>openEdit(u)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all"><Pencil size={14}/></button>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-base-border/40 text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${u.role==='admin'?'text-brand':'text-ink-secondary'}`}>{u.role==='admin'&&<ShieldCheck size={12}/>}{u.role==='admin'?'Administrador':'Empleado'}</span>
                    <button onClick={()=>toggleActive(u)} className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-base-raised transition-colors">
                      {u.active!==false?<><ToggleRight size={17} className="text-good"/><span className="text-emerald-600 font-semibold">Activo</span></>:<><ToggleLeft size={17} className="text-ink-muted"/><span className="text-ink-muted font-semibold">Inactivo</span></>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead><tr><th className="th">Nombre</th><th className="th">Correo</th><th className="th">Rol</th><th className="th">Estado</th><th className="th"/></tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="td font-semibold text-[13px]">{u.full_name}</td>
                      <td className="td text-ink-secondary text-[13px]">{u.email}</td>
                      <td className="td"><span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${u.role==='admin'?'text-brand':'text-ink-secondary'}`}>{u.role==='admin'&&<ShieldCheck size={13}/>}{u.role==='admin'?'Administrador':'Empleado'}</span></td>
                      <td className="td"><button onClick={()=>toggleActive(u)} className="inline-flex items-center gap-1.5 text-[12px] py-0.5 px-2 rounded-lg hover:bg-base-raised transition-colors">{u.active!==false?<><ToggleRight size={17} className="text-good"/><span className="text-emerald-600 font-semibold">Activo</span></>:<><ToggleLeft size={17} className="text-ink-muted"/><span className="text-ink-muted">Inactivo</span></>}</button></td>
                      <td className="td"><button onClick={()=>openEdit(u)} className="p-1.5 rounded-lg text-ink-muted hover:text-brand hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"><Pencil size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Editar usuario':'Nuevo usuario'} width="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nombre completo</label><input className="field" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} autoFocus/></div>
          <div><label className="label">Correo electrónico</label><input type="email" className="field" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} disabled={isSupabaseConfigured&&!!editing}/></div>
          {!isSupabaseConfigured&&<div><label className="label">{editing?'Nueva contraseña (opcional)':'Contraseña'}</label><input type="password" className="field" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>}
          <div><label className="label">Rol</label>
            <select className="field" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="empleado">Empleado</option><option value="admin">Administrador</option>
            </select>
          </div>
          {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-2"><button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">{editing?'Guardar cambios':'Crear usuario'}</button></div>
        </form>
      </Modal>

      {/* Modal Límite de Usuarios Alcanzado */}
      <Modal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title="Límite del Plan Alcanzado"
        width="max-w-md"
      >
        <div className="space-y-4 p-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Crown size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-bold text-slate-900 text-base">
              Límite de usuarios alcanzado
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {limitMessage || 'Alcanzaste el límite de tu plan Free (1 usuario). Actualiza a Pro para agregar más.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setLimitModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cerrar
            </button>
            <Link
              to="/planes"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/20 transition cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span>Ver Planes</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
