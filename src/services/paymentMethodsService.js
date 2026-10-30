import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { getCurrentCompanyId } from '../lib/companyContext'

const STORAGE_KEY = 'cya_company_payment_methods'

export const DEFAULT_PAYMENT_CONFIG = {
  yape: {
    enabled: true,
    phone: '',
    holder: '',
    qr_image: '',
    note: 'Yapear y enviar comprobante'
  },
  plin: {
    enabled: true,
    phone: '',
    holder: '',
    qr_image: '',
    note: 'Plin y enviar comprobante'
  },
  transfer: {
    enabled: true,
    bank: 'BCP',
    account_number: '',
    cci: '',
    holder: '',
    qr_image: '',
    note: 'Transferencia directa o interbancaria'
  },
  cash: {
    enabled: true,
    note: 'Pago en efectivo de caja'
  },
  card: {
    enabled: true,
    note: 'Tarjeta Débito / Crédito (POS)'
  }
}

export const paymentMethodsService = {
  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return structuredClone(DEFAULT_PAYMENT_CONFIG)
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_PAYMENT_CONFIG,
        ...parsed,
        yape: { ...DEFAULT_PAYMENT_CONFIG.yape, ...(parsed.yape || {}) },
        plin: { ...DEFAULT_PAYMENT_CONFIG.plin, ...(parsed.plin || {}) },
        transfer: { ...DEFAULT_PAYMENT_CONFIG.transfer, ...(parsed.transfer || {}) },
        cash: { ...DEFAULT_PAYMENT_CONFIG.cash, ...(parsed.cash || {}) },
        card: { ...DEFAULT_PAYMENT_CONFIG.card, ...(parsed.card || {}) },
      }
    } catch (e) {
      console.warn('Error reading payment methods from localStorage:', e)
      return structuredClone(DEFAULT_PAYMENT_CONFIG)
    }
  },

  /**
   * Synchronizes data loaded from Supabase `companies` table into local state
   */
  hydrateFromCompany(companyRow) {
    if (!companyRow) return this.get()
    const current = this.get()
    const fromJson = companyRow.payment_methods || {}

    const synced = {
      ...current,
      ...fromJson,
      yape: {
        ...current.yape,
        ...(fromJson.yape || {}),
        phone: companyRow.yape_phone || fromJson.yape?.phone || current.yape.phone || companyRow.phone || '',
        holder: companyRow.yape_holder || fromJson.yape?.holder || current.yape.holder || companyRow.name || '',
        qr_image: companyRow.yape_qr || fromJson.yape?.qr_image || current.yape.qr_image || ''
      },
      plin: {
        ...current.plin,
        ...(fromJson.plin || {}),
        phone: companyRow.plin_phone || fromJson.plin?.phone || current.plin.phone || companyRow.phone || '',
        holder: companyRow.plin_holder || fromJson.plin?.holder || current.plin.holder || companyRow.name || '',
        qr_image: companyRow.plin_qr || fromJson.plin?.qr_image || current.plin.qr_image || ''
      },
      transfer: {
        ...current.transfer,
        ...(fromJson.transfer || {}),
        holder: fromJson.transfer?.holder || current.transfer.holder || companyRow.name || ''
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(synced))
      window.dispatchEvent(new CustomEvent('cya-payment-methods-updated', { detail: synced }))
    } catch (e) {
      console.warn('Error caching payment methods from Supabase:', e)
    }
    return synced
  },

  async save(config) {
    try {
      const current = this.get()
      const merged = {
        ...current,
        ...config,
        yape: { ...current.yape, ...(config.yape || {}) },
        plin: { ...current.plin, ...(config.plin || {}) },
        transfer: { ...current.transfer, ...(config.transfer || {}) },
        cash: { ...current.cash, ...(config.cash || {}) },
        card: { ...current.card, ...(config.card || {}) },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      window.dispatchEvent(new CustomEvent('cya-payment-methods-updated', { detail: merged }))

      // Sincronizar en Supabase si está conectado
      if (isSupabaseConfigured) {
        try {
          const companyId = await getCurrentCompanyId().catch(() => null)
          if (companyId) {
            await supabase.from('companies').update({
              yape_qr: merged.yape?.qr_image || null,
              yape_phone: merged.yape?.phone || null,
              yape_holder: merged.yape?.holder || null,
              plin_qr: merged.plin?.qr_image || null,
              plin_phone: merged.plin?.phone || null,
              plin_holder: merged.plin?.holder || null,
              payment_methods: merged
            }).eq('id', companyId)
          }
        } catch (dbErr) {
          console.warn('Nota: Guardado local exitoso. Si falta la columna en Supabase, ejecuta el script SQL:', dbErr)
        }
      }

      return merged
    } catch (e) {
      console.error('Error saving payment methods:', e)
      throw e
    }
  },

  /**
   * Intenta subir la imagen al bucket 'company-assets' de Supabase Storage.
   * Si no está disponible el bucket, comprime y retorna la imagen en Base64.
   */
  async processImageFile(file, methodKey = 'qr') {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('El archivo seleccionado no es una imagen válida')
    }

    // 1. Intento de subida a Supabase Storage (Bucket 'company-assets')
    if (isSupabaseConfigured) {
      try {
        const companyId = await getCurrentCompanyId().catch(() => null)
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${companyId || 'company'}_${methodKey}_${Date.now()}.${fileExt}`
        const filePath = `qrs/${fileName}`

        const { data, error } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file, { upsert: true })

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(filePath)
          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl
          }
        }
      } catch (err) {
        console.warn('Supabase storage fallback to compressed base64:', err)
      }
    }

    // 2. Fallback a Base64 optimizado (máximo 800px)
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'))
      reader.onload = (e) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Error al decodificar la imagen'))
        img.onload = () => {
          const MAX_DIM = 800
          let width = img.width
          let height = img.height

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            } else {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve(compressedDataUrl)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }
}
