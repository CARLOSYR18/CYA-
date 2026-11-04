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
  /**
   * Procesa la imagen inteligentemente:
   * - Detecta dimensiones y recorta márgenes excesivos vacíos/blancos (Smart Auto-Crop).
   * - Preserva transparencia de PNG/WebP (no fuerza JPEG negro).
   * - Sube a Supabase Storage 'company-assets' o retorna Base64 optimizado.
   */
  async processImageFile(file, methodKey = 'qr') {
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('El archivo seleccionado no es una imagen válida')
    }

    // Procesar y recortar la imagen mediante Canvas antes de subir o guardar
    const { blob, dataUrl, isPng } = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'))
      reader.onload = (e) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Error al decodificar la imagen'))
        img.onload = () => {
          const MAX_DIM = 900
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

          // Smart Auto-Crop / Trimming de márgenes vacíos o blancos
          let finalCanvas = canvas
          try {
            const imgData = ctx.getImageData(0, 0, width, height)
            const d = imgData.data

            // Verificar esquina superior izquierda
            const r0 = d[0], g0 = d[1], b0 = d[2], a0 = d[3]
            const isWhiteBg = a0 > 230 && r0 > 240 && g0 > 240 && b0 > 240
            const isBlackBg = a0 > 230 && r0 < 15 && g0 < 15 && b0 < 15

            const isBgPixel = (idx) => {
              const a = d[idx + 3]
              if (a < 15) return true // transparente
              if (isWhiteBg) return d[idx] > 240 && d[idx + 1] > 240 && d[idx + 2] > 240
              if (isBlackBg) return d[idx] < 20 && d[idx + 1] < 20 && d[idx + 2] < 20
              return false
            }

            let minX = width, minY = height, maxX = 0, maxY = 0
            let hasContent = false

            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4
                if (!isBgPixel(idx)) {
                  if (x < minX) minX = x
                  if (x > maxX) maxX = x
                  if (y < minY) minY = y
                  if (y > maxY) maxY = y
                  hasContent = true
                }
              }
            }

            // Si se detectó contenido con márgenes para recortar
            if (hasContent && (maxX - minX > 20) && (maxY - minY > 20)) {
              const pad = 6
              const cropX = Math.max(0, minX - pad)
              const cropY = Math.max(0, minY - pad)
              const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2)
              const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2)

              const trimmed = document.createElement('canvas')
              trimmed.width = cropW
              trimmed.height = cropH
              const tCtx = trimmed.getContext('2d')
              tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
              finalCanvas = trimmed
            }
          } catch (cropErr) {
            console.warn('Auto-trimming omitido:', cropErr)
          }

          const isPng = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/svg+xml'
          const mime = isPng ? 'image/png' : 'image/jpeg'
          const quality = isPng ? undefined : 0.9

          const dataUrl = finalCanvas.toDataURL(mime, quality)
          finalCanvas.toBlob((blob) => {
            resolve({ blob: blob || file, dataUrl, isPng })
          }, mime, quality)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })

    // 1. Intento de subida a Supabase Storage (Bucket 'company-assets')
    if (isSupabaseConfigured) {
      try {
        const companyId = await getCurrentCompanyId().catch(() => null)
        const fileExt = isPng ? 'png' : 'jpg'
        const fileName = `${companyId || 'company'}_${methodKey}_${Date.now()}.${fileExt}`
        const filePath = `qrs/${fileName}`

        const uploadFile = blob || file
        const { data, error } = await supabase.storage
          .from('company-assets')
          .upload(filePath, uploadFile, { upsert: true, contentType: isPng ? 'image/png' : 'image/jpeg' })

        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(filePath)
          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl
          }
        }
      } catch (err) {
        console.warn('Supabase storage fallback to dataUrl:', err)
      }
    }

    // 2. Fallback a DataURL recortado y optimizado
    return dataUrl
  }
}
