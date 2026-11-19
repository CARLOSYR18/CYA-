/**
 * Utilidad unificada para exportación de datos a formato CSV compatible con Microsoft Excel.
 * Incluye Byte Order Mark (BOM) UTF-8 (\uFEFF) para garantizar que Excel abra
 * caracteres especiales en español (tildes, Ñ, símbolo de Soles S/ y USD $)
 * sin corrupción de codificación.
 *
 * @param {Object} options
 * @param {string} options.filename - Nombre del archivo a descargar (sin extensión obligatoria)
 * @param {Array<Object>} options.columns - Definición de columnas [{ header: 'Nombre', key: 'name', format?: fn }]
 * @param {Array<Object>} options.data - Lista de registros a exportar
 */
export function exportToExcel({ filename = 'reporte', columns = [], data = [] }) {
  if (!data || data.length === 0) {
    throw new Error('No hay datos disponibles para exportar.')
  }

  if (!columns || columns.length === 0) {
    throw new Error('No se han especificado las columnas de exportación.')
  }

  // 1. Cabeceras
  const headerRow = columns.map((col) => `"${String(col.header || '').replace(/"/g, '""')}"`).join(',')

  // 2. Filas de datos
  const dataRows = data.map((item) => {
    return columns
      .map((col) => {
        let val
        if (typeof col.format === 'function') {
          val = col.format(item[col.key], item)
        } else if (typeof col.accessor === 'function') {
          val = col.accessor(item)
        } else {
          val = item[col.key]
        }

        if (val === null || val === undefined) {
          val = ''
        }

        if (typeof val === 'number') {
          return val
        }

        const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
        return `"${str}"`
      })
      .join(',')
  })

  // 3. BOM UTF-8 (\uFEFF) para Excel
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const cleanName = filename.endsWith('.csv') ? filename : `${filename}.csv`
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', cleanName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
