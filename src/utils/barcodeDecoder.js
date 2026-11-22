/**
 * Barcode Decoding Engine for Mobile & Desktop
 * Supports: EAN-13, EAN-8, Code-128, UPC-A, UPC-E, Code-39, QR
 * Compatible with iOS Safari, Chrome Mobile, Android, macOS and Windows.
 */

let zxingPromise = null

export function loadZXing() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'))
  if (window.ZXing) return Promise.resolve(window.ZXing)

  if (zxingPromise) return zxingPromise

  zxingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-zxing="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.ZXing))
      existing.addEventListener('error', reject)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'
    script.setAttribute('data-zxing', 'true')
    script.async = true

    script.onload = () => {
      if (window.ZXing) resolve(window.ZXing)
      else reject(new Error('ZXing script loaded but window.ZXing not found'))
    }

    script.onerror = () => {
      // Fallback CDN if jsdelivr fails
      const fallback = document.createElement('script')
      fallback.src = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js'
      fallback.setAttribute('data-zxing', 'true')
      fallback.async = true
      fallback.onload = () => resolve(window.ZXing)
      fallback.onerror = () => reject(new Error('Failed to load ZXing library from all CDNs'))
      document.head.appendChild(fallback)
    }

    document.head.appendChild(script)
  })

  return zxingPromise
}

// ─── EAN-13 & UPC Pure Canvas Scanline Fallback ───
// EAN-13 L, G, R patterns (encoded as 4 widths: [space, bar, space, bar] or [bar, space, bar, space])
const L_PATTERNS = [
  [3, 2, 1, 1], // 0
  [2, 2, 2, 1], // 1
  [2, 1, 2, 2], // 2
  [1, 4, 1, 1], // 3
  [1, 1, 3, 2], // 4
  [1, 2, 3, 1], // 5
  [1, 1, 1, 4], // 6
  [1, 3, 1, 2], // 7
  [1, 2, 1, 3], // 8
  [3, 1, 1, 2]  // 9
]

const G_PATTERNS = [
  [1, 1, 2, 3], // 0
  [1, 2, 2, 2], // 1
  [2, 2, 1, 2], // 2
  [1, 1, 4, 1], // 3
  [2, 3, 1, 1], // 4
  [1, 3, 2, 1], // 5
  [4, 1, 1, 1], // 6
  [2, 1, 3, 1], // 7
  [3, 1, 2, 1], // 8
  [2, 1, 1, 3]  // 9
]

const FIRST_DIGIT_PARITY = [
  'LLLLLL', // 0
  'LLGLGG', // 1
  'LLGGLG', // 2
  'LLGGGL', // 3
  'LGLLGG', // 4
  'LGGLLG', // 5
  'LGGGLL', // 6
  'LGLGLG', // 7
  'LGLGGL', // 8
  'LGGLGL'  // 9
]

function validateEan13Checksum(code) {
  if (!code || code.length !== 13) return false
  const digits = code.split('').map(Number)
  if (digits.some(isNaN)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3
  }
  const check = (10 - (sum % 10)) % 10
  return check === digits[12]
}

function matchDigit(widths, patterns) {
  let bestDigit = -1
  let minDiff = 0.8 // threshold

  for (let d = 0; d < 10; d++) {
    const target = patterns[d]
    let diff = 0
    for (let i = 0; i < 4; i++) {
      diff += Math.abs(widths[i] - target[i])
    }
    if (diff < minDiff) {
      minDiff = diff
      bestDigit = d
    }
  }
  return bestDigit
}

/**
 * Scan video canvas across horizontal lines for 1D EAN-13 barcodes
 */
export function decodeEan13FromCanvas(ctx, width, height) {
  const scanlines = [
    Math.floor(height * 0.4),
    Math.floor(height * 0.45),
    Math.floor(height * 0.5),
    Math.floor(height * 0.55),
    Math.floor(height * 0.6)
  ]

  for (const y of scanlines) {
    const imgData = ctx.getImageData(0, y, width, 1).data
    // Convert to grayscale luminance
    const lum = new Uint8Array(width)
    let minLum = 255
    let maxLum = 0
    for (let x = 0; x < width; x++) {
      const idx = x * 4
      const v = (imgData[idx] * 299 + imgData[idx + 1] * 587 + imgData[idx + 2] * 114) / 1000
      lum[x] = v
      if (v < minLum) minLum = v
      if (v > maxLum) maxLum = v
    }

    if (maxLum - minLum < 35) continue // Low contrast line

    const threshold = (minLum + maxLum) / 2

    // Run-length encode transitions
    const runs = []
    let currentVal = lum[0] < threshold ? 1 : 0
    let count = 0

    for (let x = 0; x < width; x++) {
      const bit = lum[x] < threshold ? 1 : 0
      if (bit === currentVal) {
        count++
      } else {
        runs.push({ val: currentVal, count })
        currentVal = bit
        count = 1
      }
    }
    runs.push({ val: currentVal, count })

    // EAN-13 has at least 59 bars/spaces (3 start + 24 left + 5 center + 24 right + 3 end)
    if (runs.length < 59) continue

    // Search for start guard: 1, 0, 1
    for (let r = 0; r < runs.length - 58; r++) {
      if (runs[r].val !== 1 || runs[r + 1].val !== 0 || runs[r + 2].val !== 1) continue

      const u1 = runs[r].count
      const u2 = runs[r + 1].count
      const u3 = runs[r + 2].count
      const unit = (u1 + u2 + u3) / 3
      if (unit < 1) continue

      let idx = r + 3
      const leftDigits = []
      const parityTypes = []
      let valid = true

      for (let digit = 0; digit < 6; digit++) {
        if (idx + 3 >= runs.length) { valid = false; break }
        const w = [
          runs[idx].count / unit,
          runs[idx + 1].count / unit,
          runs[idx + 2].count / unit,
          runs[idx + 3].count / unit
        ]
        const sumW = w[0] + w[1] + w[2] + w[3]
        const norm = w.map(v => (v / sumW) * 7)

        const dL = matchDigit(norm, L_PATTERNS)
        const dG = matchDigit(norm, G_PATTERNS)

        if (dL !== -1) {
          leftDigits.push(dL)
          parityTypes.push('L')
        } else if (dG !== -1) {
          leftDigits.push(dG)
          parityTypes.push('G')
        } else {
          valid = false
          break
        }
        idx += 4
      }

      if (!valid || leftDigits.length !== 6) continue

      // Check center guard: 0, 1, 0, 1, 0
      if (
        runs[idx]?.val !== 0 ||
        runs[idx + 1]?.val !== 1 ||
        runs[idx + 2]?.val !== 0 ||
        runs[idx + 3]?.val !== 1 ||
        runs[idx + 4]?.val !== 0
      ) {
        continue
      }
      idx += 5

      // Decode right 6 digits (R patterns, which have same normalized widths as L patterns)
      const rightDigits = []
      for (let digit = 0; digit < 6; digit++) {
        if (idx + 3 >= runs.length) { valid = false; break }
        const w = [
          runs[idx].count / unit,
          runs[idx + 1].count / unit,
          runs[idx + 2].count / unit,
          runs[idx + 3].count / unit
        ]
        const sumW = w[0] + w[1] + w[2] + w[3]
        const norm = w.map(v => (v / sumW) * 7)

        const dR = matchDigit(norm, L_PATTERNS)
        if (dR !== -1) {
          rightDigits.push(dR)
        } else {
          valid = false
          break
        }
        idx += 4
      }

      if (!valid || rightDigits.length !== 6) continue

      // Resolve first digit from parity pattern
      const parityStr = parityTypes.join('')
      const firstDigit = FIRST_DIGIT_PARITY.indexOf(parityStr)
      if (firstDigit === -1) continue

      const fullCode = `${firstDigit}${leftDigits.join('')}${rightDigits.join('')}`
      if (validateEan13Checksum(fullCode)) {
        return fullCode
      }
    }
  }

  return null
}
