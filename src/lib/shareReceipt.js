import html2canvas from 'html2canvas'

// Convierte el nodo DOM de la boleta en una imagen PNG y la comparte con
// el selector nativo del sistema (WhatsApp, correo, etc.). Si el navegador
// no soporta compartir archivos (la mayoría de PCs), descarga la imagen y
// abre WhatsApp con el texto, para que el usuario la adjunte a mano.
export async function shareReceiptAsImage(element, { fileName, whatsappText, phone }) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' })
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  const file = new File([blob], fileName, { type: 'image/png' })

  const canShareFiles = navigator.canShare && navigator.canShare({ files: [file] })
  alert(`canShareFiles: ${canShareFiles} | fileType: ${file.type} | fileSize: ${file.size}`)

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], text: whatsappText })
      return { method: 'share' }
    } catch (err) {
      alert('Error al compartir: ' + (err?.message || err))
      return { method: 'cancelled' }
    }
  }

  // Respaldo (típicamente en escritorio): descarga la imagen y abre WhatsApp
  // con el texto ya escrito, para que la adjunten manualmente.
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
