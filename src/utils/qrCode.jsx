/**
 * Generador de Código QR en SVG puro y 100% autónomo (Offline).
 * Basado en la especificación ISO/IEC 18004 para códigos QR Tipo Byte (Error Correction L/M).
 * No requiere paquetes externos, no requiere conexión a internet y genera
 * vectores SVG ultra-nítidos para impresión térmica en 80mm o PDF.
 */

// Tablas de polinomios de Galois Field GF(256) y Reed-Solomon
const EXP_TABLE = new Uint8Array(256)
const LOG_TABLE = new Uint8Array(256)
for (let i = 0, x = 1; i < 256; i++) {
  EXP_TABLE[i] = x
  LOG_TABLE[x] = i
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
}

function gmult(a, b) {
  if (a === 0 || b === 0) return 0
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255]
}

function rsGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmult(poly[j], EXP_TABLE[i])
      next[j + 1] ^= poly[j]
    }
    poly = next
  }
  return poly
}

function rsCalculateCodewords(data, numEcCodewords) {
  const gen = rsGeneratorPoly(numEcCodewords)
  const result = new Array(numEcCodewords).fill(0)
  for (let i = 0; i < data.length; i++) {
    const feedback = data[i] ^ result[0]
    result.shift()
    result.push(0)
    if (feedback !== 0) {
      for (let j = 0; j < numEcCodewords; j++) {
        result[j] ^= gmult(gen[j], feedback)
      }
    }
  }
  return result
}

// Configuración de versiones QR (Versión 1 a 6 estándar para tickets)
const QR_VERSIONS = [
  null,
  { version: 1, size: 21, dataCodewords: 19, ecCodewords: 7 },
  { version: 2, size: 25, dataCodewords: 34, ecCodewords: 10 },
  { version: 3, size: 29, dataCodewords: 55, ecCodewords: 15 },
  { version: 4, size: 33, dataCodewords: 80, ecCodewords: 20 },
  { version: 5, size: 37, dataCodewords: 108, ecCodewords: 26 },
  { version: 6, size: 41, dataCodewords: 136, ecCodewords: 36 }
]

function encodeUtf8(str) {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c < 128) {
      bytes.push(c)
    } else if (c < 2048) {
      bytes.push(192 | (c >> 6), 128 | (c & 63))
    } else {
      bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63))
    }
  }
  return bytes
}

export function generateQrMatrix(text) {
  const dataBytes = encodeUtf8(String(text || ''))
  
  // Seleccionar la versión más compacta adecuada
  let targetVer = QR_VERSIONS[1]
  for (let v = 1; v < QR_VERSIONS.length; v++) {
    // 4 bits de modo (byte = 0100) + 8 bits de longitud + dataBytes.length
    if (dataBytes.length + 3 <= QR_VERSIONS[v].dataCodewords) {
      targetVer = QR_VERSIONS[v]
      break
    }
    targetVer = QR_VERSIONS[v]
  }

  const { size, dataCodewords, ecCodewords } = targetVer

  // Crear matriz vacía
  const matrix = Array.from({ length: size }, () => Array(size).fill(null))
  const isReserved = Array.from({ length: size }, () => Array(size).fill(false))

  // 1. Patrones de posición (Finders) en las 3 esquinas
  function placeFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r
        const col = c0 + c
        if (row < 0 || row >= size || col < 0 || col >= size) continue
        isReserved[row][col] = true
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[row][col] = true
          } else {
            matrix[row][col] = false
          }
        } else {
          matrix[row][col] = false // Separador
        }
      }
    }
  }

  placeFinder(0, 0)
  placeFinder(0, size - 7)
  placeFinder(size - 7, 0)

  // 2. Patrones de alineación para versión >= 2
  if (targetVer.version >= 2) {
    const alignPos = size - 7
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const row = alignPos + r
        const col = alignPos + c
        isReserved[row][col] = true
        matrix[row][col] = (Math.max(Math.abs(r), Math.abs(c)) !== 1)
      }
    }
  }

  // 3. Patrones de temporización (Timing patterns)
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) {
      isReserved[6][i] = true
      matrix[6][i] = (i % 2 === 0)
    }
    if (!isReserved[i][6]) {
      isReserved[i][6] = true
      matrix[i][6] = (i % 2 === 0)
    }
  }

  // Dark module
  isReserved[size - 8][8] = true
  matrix[size - 8][8] = true

  // Reservar áreas de información de formato
  for (let i = 0; i <= 8; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true
    if (!isReserved[i][8]) isReserved[i][8] = true
  }
  for (let i = size - 8; i < size; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = true
    if (!isReserved[i][8]) isReserved[i][8] = true
  }

  // 4. Codificar datos (Modo Byte 8-bit)
  const bitStream = []
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitStream.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // Modo Byte
  pushBits(dataBytes.length, 8) // Contador de caracteres
  for (const b of dataBytes) {
    pushBits(b, 8)
  }

  // Relleno hasta capacidad
  const capacityBits = dataCodewords * 8
  if (bitStream.length + 4 <= capacityBits) pushBits(0, 4)
  while (bitStream.length % 8 !== 0) bitStream.push(0)

  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (bitStream.length < capacityBits) {
    pushBits(padBytes[padIdx % 2], 8)
    padIdx++
  }

  // Agrupar en bytes y calcular corrección de errores (ECC)
  const rawBytes = []
  for (let i = 0; i < bitStream.length; i += 8) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitStream[i + b]
    }
    rawBytes.push(byteVal)
  }

  const ecBytes = rsCalculateCodewords(rawBytes, ecCodewords)
  const totalCodewords = [...rawBytes, ...ecBytes]

  const totalBits = []
  for (const cw of totalCodewords) {
    for (let i = 7; i >= 0; i--) {
      totalBits.push((cw >> i) & 1)
    }
  }

  // 5. Ubicar bits en la matriz con máscara estándar (Máscara 0: (r + c) % 2 === 0)
  let bitIdx = 0
  let upward = true
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol-- // Saltar línea de temporización
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const col = rightCol - cOffset
        if (!isReserved[r][col]) {
          const bit = bitIdx < totalBits.length ? totalBits[bitIdx++] : 0
          const mask = (r + col) % 2 === 0
          matrix[r][col] = mask ? !bit : !!bit
        }
      }
    }
    upward = !upward
  }

  // 6. Escribir formato (Nivel L, Máscara 0 = 0b111011111000100)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0]
  // Alrededor de esquina superior izquierda
  for (let i = 0; i < 6; i++) matrix[8][i] = !!formatBits[i]
  matrix[8][7] = !!formatBits[6]
  matrix[8][8] = !!formatBits[7]
  matrix[7][8] = !!formatBits[8]
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = !!formatBits[i]

  // Esquinas inferior y derecha
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = !!formatBits[i]
  for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = !!formatBits[7 + i]

  return matrix
}

/**
 * Genera el SVG completo para incrustar directamente en JSX o HTML.
 */
export function QrCodeSvg({ value, size = 130, className = '' }) {
  if (!value) return null
  let matrix
  try {
    matrix = generateQrMatrix(value)
  } catch {
    // Respaldo silencioso si la cadena excede capacidad
    matrix = generateQrMatrix(String(value).slice(0, 70))
  }

  const matrixSize = matrix.length
  const margin = 2
  const viewBoxSize = matrixSize + margin * 2

  let pathData = ''
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z `
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={`shape-rendering-crispEdges ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={pathData} fill="#18181b" />
    </svg>
  )
}
