import { useEffect, useState } from 'react'
import { Building2, Save, CheckCircle2, ImageIcon } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { companySettingsService } from '../services/companySettingsService'

const emptyForm = {name:'',ruc:'',address:'',phone:'',logo_url:''}

export default function CompanySettings() {
  const [form,setForm]     = useState(emptyForm)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving]   = useState(false)
  const [saved,setSaved]     = useState(false)
  const [error,setError]     = useState('')

  useEffect(()=>{companySettingsService.get().then(data=>{setForm({name:data.name||'',ruc:data.ruc||'',address:data.address||'',phone:data.phone||'',logo_url:data.logo_url||''});setLoading(false)})},[])
  const field=(key)=>({value:form[key],onChange:(e)=>{setForm({...form,[key]:e.target.value});setSaved(false)}})

  async function handleSubmit(e){
    e.preventDefault();setError('')
    if(!form.name.trim()){setError('El nombre de la empresa es obligatorio');return}
    setSaving(true)
    try{await companySettingsService.save(form);setSaved(true)}
    catch(err){setError(err.message||'No se pudo guardar la configuración')}
    finally{setSaving(false)}
  }

  return (
    <AppLayout title="Configuración de empresa">
      {loading
        ?<div className="flex items-center justify-center py-20"><div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin"/></div>
        :(
        <div className="max-w-2xl mx-auto">
          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-base-border">
              <div className="h-20 w-20 rounded-2xl border-2 border-base-border flex items-center justify-center shrink-0 overflow-hidden bg-base-raised">
                {form.logo_url?<img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" onError={e=>{e.currentTarget.style.display='none'}}/>:<Building2 size={32} className="text-ink-muted"/>}
              </div>
              <div>
                <p className="font-display font-bold text-ink-primary text-xl">{form.name||'Nombre de empresa'}</p>
                {form.ruc&&<p className="text-[12px] font-mono text-ink-muted mt-0.5">RUC: {form.ruc}</p>}
                <p className="text-xs text-ink-muted mt-1.5">Vista previa del encabezado de boleta</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="label">Nombre de la empresa <span className="text-bad normal-case font-normal">*</span></label><input className="field" placeholder="Ej. CYA Soluciones SAC" {...field('name')} autoFocus/></div>
                <div><label className="label">RUC</label><input className="field font-mono" placeholder="20xxxxxxxxx" maxLength={11} {...field('ruc')}/></div>
                <div><label className="label">Teléfono</label><input className="field" placeholder="+51 987 654 321" {...field('phone')}/></div>
                <div className="sm:col-span-2"><label className="label">Dirección</label><input className="field" placeholder="Av. Ejemplo 123, Lima" {...field('address')}/></div>
                <div className="sm:col-span-2">
                  <label className="label flex items-center gap-1.5"><ImageIcon size={12}/> URL del logo <span className="text-ink-muted font-normal normal-case">(opcional)</span></label>
                  <input className="field font-mono text-xs" placeholder="https://ejemplo.com/logo.png" {...field('logo_url')}/>
                  <p className="text-xs text-ink-muted mt-1">Pega la URL directa de una imagen PNG/SVG. Se mostrará en las boletas.</p>
                </div>
              </div>
              {error&&<p className="text-sm text-bad bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
              <div className="flex items-center justify-between pt-2">
                {saved?<span className="flex items-center gap-2 text-sm text-good font-semibold"><CheckCircle2 size={16}/> Configuración guardada</span>:<span/>}
                <button type="submit" disabled={saving} className="btn-primary"><Save size={14}/> {saving?'Guardando…':'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
