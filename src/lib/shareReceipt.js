import html2canvas from 'html2canvas'

export async function shareReceiptAsImage(element, { fileName, whatsappText, phone }) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' })
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], fileName, { type: 'image/png' })

  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] })

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], text: whatsappText })
      return { method: 'share' }
    } catch (err) {
      // AbortError = el usuario cerró el panel de compartir a propósito, no es un error real
      if (err?.name === 'AbortError') return { method: 'cancelled' }

      // Cualquier otro error (ej. NotAllowedError por el tiempo del gesto del
      // usuario) cae al plan B en vez de quedarse en silencio.
      alert('No se pudo abrir el panel de compartir (' + (err?.name || 'error') + '). Se descargará la imagen y se abrirá WhatsApp con el texto.')
    }
  }

  // Plan B: descarga la imagen y abre WhatsApp con el texto, para adjuntarla a mano.
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)

  const waUrl = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
  window.open(waUrl, '_blank')

  return { method: 'download+wa' }
}
