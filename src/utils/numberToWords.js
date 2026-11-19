/**
 * Convierte un importe numérico a su representación legal en letras (Español / Perú).
 * Ej: 85.00 -> "OCHENTA Y CINCO CON 00/100 SOLES"
 */
export function numberToWordsPE(amount, currency = 'SOLES') {
  const num = Math.abs(Number(amount) || 0)
  const enteros = Math.floor(num)
  const centavos = Math.round((num - enteros) * 100)
  const centavosStr = String(centavos).padStart(2, '0') + '/100'

  if (enteros === 0) {
    return `CERO CON ${centavosStr} ${currency}`.toUpperCase()
  }

  const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const DIECES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
  const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  function convertGroup(n) {
    let output = ''
    if (n === 100) return 'CIEN'

    const c = Math.floor(n / 100)
    const d = Math.floor((n % 100) / 10)
    const u = n % 10

    if (c > 0) output += CENTENAS[c] + ' '

    if (d === 1) {
      output += DIECES[u] + ' '
    } else if (d === 2) {
      if (u === 0) output += 'VEINTE '
      else output += 'VEINTI' + UNIDADES[u] + ' '
    } else if (d > 2) {
      output += DECENAS[d]
      if (u > 0) output += ' Y ' + UNIDADES[u]
      output += ' '
    } else if (u > 0) {
      output += UNIDADES[u] + ' '
    }

    return output.trim()
  }

  let words = ''
  const millones = Math.floor(enteros / 1000000)
  const miles = Math.floor((enteros % 1000000) / 1000)
  const restos = enteros % 1000

  if (millones > 0) {
    if (millones === 1) words += 'UN MILLON '
    else words += convertGroup(millones) + ' MILLONES '
  }

  if (miles > 0) {
    if (miles === 1) words += 'MIL '
    else words += convertGroup(miles) + ' MIL '
  }

  if (restos > 0 || words === '') {
    words += convertGroup(restos) + ' '
  }

  return `SON: ${words.trim()} CON ${centavosStr} ${currency}`.toUpperCase()
}
