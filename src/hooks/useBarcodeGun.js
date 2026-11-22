import { useEffect, useRef } from 'react'

/**
 * Custom hook to detect input from hardware barcode scanner guns (USB / Bluetooth).
 * Barcode guns type characters in rapid succession (< 40ms) and finish with 'Enter'.
 *
 * @param {Function} onScan - Callback when a barcode is scanned: onScan(barcodeString)
 * @param {Object} options - { enabled: true, minLength: 3, maxIntervalMs: 50 }
 */
export function useBarcodeGun(onScan, options = {}) {
  const { enabled = true, minLength = 3, maxIntervalMs = 50 } = options
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      // Ignore if user is typing into a multiline textarea
      const target = e.target
      const tagName = target?.tagName?.toLowerCase()
      if (tagName === 'textarea') return

      const now = Date.now()
      const diff = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      // If too much time has passed between characters, reset buffer
      if (diff > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        bufferRef.current = ''

        if (code.length >= minLength) {
          // Barcode scanner detected!
          e.preventDefault()
          e.stopPropagation()
          if (typeof onScanRef.current === 'function') {
            onScanRef.current(code)
          }
        }
        return
      }

      // Collect printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, minLength, maxIntervalMs])
}
