import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DiscardChangesModal from '../components/ui/DiscardChangesModal'

/**
 * Hook para proteger formularios con datos ingresados contra salidas involuntarias o recargas.
 *
 * @param {Object} options
 * @param {boolean} options.isDirty - Indica si el formulario tiene datos ingresados sin guardar
 * @param {string} [options.defaultRedirectUrl] - Ruta por defecto a la que volver al descartar
 * @param {Function} [options.onConfirmLeave] - Callback ejecutado al confirmar salida
 * @param {string} [options.modalTitle] - Título personalizado para el modal
 * @param {string} [options.modalDescription] - Descripción personalizada para el modal
 */
export function useFormLeaveGuard({
  isDirty = false,
  defaultRedirectUrl = -1,
  onConfirmLeave,
  modalTitle,
  modalDescription,
} = {}) {
  const navigate = useNavigate()
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [pendingTarget, setPendingTarget] = useState(null)

  // 1. Interceptar recargas de página o cierre de pestaña (F5 / Refresh / Cerrar)
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 2. Interceptar clic en enlaces (Sidebar, Topbar, Breadcrumbs)
  useEffect(() => {
    if (!isDirty) return

    const handleCaptureClick = (e) => {
      const anchor = e.target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      // Ignorar anclas vacías, hashes, mailto, tel o target blank
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) {
        return
      }

      // Si es la misma ruta actual, no bloquear
      if (href === window.location.pathname) return

      e.preventDefault()
      e.stopPropagation()
      setPendingTarget(href)
      setShowDiscardModal(true)
    }

    document.addEventListener('click', handleCaptureClick, true)
    return () => document.removeEventListener('click', handleCaptureClick, true)
  }, [isDirty])

  // 3. Interceptar botón atrás del navegador o swipe de volver en móviles
  useEffect(() => {
    if (!isDirty) return

    // Insertar estado temporal en el historial para atrapar el evento popstate
    window.history.pushState({ formGuard: true }, '', window.location.href)

    const handlePopState = () => {
      // Re-insertar para mantener al usuario en la página mientras decide en el modal
      window.history.pushState({ formGuard: true }, '', window.location.href)
      setPendingTarget(defaultRedirectUrl)
      setShowDiscardModal(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isDirty, defaultRedirectUrl])

  // Solicitar salida manualmente (para botones como "Atrás", "Cancelar", "Volver")
  const requestLeave = useCallback(
    (target) => {
      const dest = target !== undefined ? target : defaultRedirectUrl
      if (!isDirty) {
        if (typeof dest === 'function') dest()
        else if (typeof dest === 'number') navigate(dest)
        else if (dest) navigate(dest)
        else navigate(-1)
        return
      }
      setPendingTarget(dest)
      setShowDiscardModal(true)
    },
    [isDirty, defaultRedirectUrl, navigate]
  )

  // Confirmar descarte y proceder con la navegación
  const confirmLeave = useCallback(() => {
    setShowDiscardModal(false)
    if (onConfirmLeave) {
      try {
        onConfirmLeave()
      } catch {}
    }

    const dest = pendingTarget !== null ? pendingTarget : defaultRedirectUrl
    setPendingTarget(null)

    if (typeof dest === 'function') {
      dest()
    } else if (typeof dest === 'number') {
      navigate(dest)
    } else if (dest) {
      navigate(dest)
    } else {
      navigate(-1)
    }
  }, [pendingTarget, defaultRedirectUrl, onConfirmLeave, navigate])

  // Cancelar salida y permanecer en el formulario
  const cancelLeave = useCallback(() => {
    setShowDiscardModal(false)
    setPendingTarget(null)
  }, [])

  // Componente del modal listo para incrustar
  const DiscardModalComponent = (
    <DiscardChangesModal
      open={showDiscardModal}
      onClose={cancelLeave}
      onConfirm={confirmLeave}
      title={modalTitle}
      description={modalDescription}
    />
  )

  return {
    showDiscardModal,
    requestLeave,
    confirmLeave,
    cancelLeave,
    DiscardModalComponent,
  }
}

