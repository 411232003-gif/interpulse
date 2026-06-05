import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type HealthStatus = 'Rendah' | 'Normal' | 'Batas' | 'Tinggi'

export interface MonitoringExportContext {
  kelurahan: string
  selectedMonth: string
  selectedMonthLabel: string
  year: number
  months: string[]
  monthLabels: Record<string, string>
  rwList: string[]
  customTargets: Record<string, number>
  healthReadings: Record<string, Record<string, number>>
  healthReadingsDetails: Record<string, any[]>
  attendanceData: Record<string, Record<string, number>>
  residentsData: Record<string, any>
  tableData: any[]
  tbbbData: Record<string, any[]>
  getHealthStatus: (type: string, value: number, gender?: string) => { status: HealthStatus }
}

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const EXAM_TYPES = [
  { key: 'kolesterol', label: 'Kolesterol' },
  { key: 'tensi', label: 'Tensi' },
  { key: 'guladarah', label: 'Gula Darah' },
  { key: 'asamurat', label: 'Asam Urat' },
  { key: 'nadi', label: 'Nadi' },
  { key: 'imt', label: 'IMT' },
] as const

const CATEGORIES: HealthStatus[] = ['Rendah', 'Normal', 'Batas', 'Tinggi']
const CATEGORY_LABELS: Record<HealthStatus, string> = {
  Rendah: 'Rendah', Normal: 'Normal', Batas: 'Batas Tinggi', Tinggi: 'Tinggi',
}

const CAT_COLORS: Record<HealthStatus, { fill: string; font: string; pdf: [number, number, number] }> = {
  Rendah: { fill: 'FFDBEAFE', font: 'FF1D4ED8', pdf: [219, 234, 254] },
  Normal: { fill: 'FFDCFCE7', font: 'FF15803D', pdf: [220, 252, 231] },
  Batas: { fill: 'FFFEF9C3', font: 'FFA16207', pdf: [254, 249, 195] },
  Tinggi: { fill: 'FFFEE2E2', font: 'FFB91C1C', pdf: [254, 226, 226] },
}

const HEADER_FILL = 'FF4F46E5'
const HEADER_FONT = 'FFFFFFFF'
const ALT_FILL = 'FFEEF2FF'

function sortRw(a: string, b: string) {
  return parseInt(a || '0', 10) - parseInt(b || '0', 10)
}

function getFileName(ctx: MonitoringExportContext, ext: string) {
  const monthName = MONTH_NAMES_ID[ctx.months.indexOf(ctx.selectedMonth)] || ctx.selectedMonth
  return `monitoring-kesehatan-${monthName}-${ctx.year}.${ext}`
}

function buildResidentsList(ctx: MonitoringExportContext) {
  const seen = new Set<string>()
  const list: any[] = []
  Object.values(ctx.residentsData).forEach(r => {
    if (!r?.nik || seen.has(r.nik)) return
    seen.add(r.nik)
    list.push({
      nama: r.nama || r.name || '-',
      nik: r.nik,
      rw: r.rw || '-',
      rt: r.rt || '-',
      birthDate: r.birthDate || r.tglLahir || '-',
      umur: r.umur ?? (r.birthDate ? calcAge(r.birthDate) : '-'),
      alamat: r.alamat || r.kelurahan || '-',
      jenisKelamin: normalizeGender(r.jenisKelamin || r.gender),
    })
  })
  return list.sort((a, b) => sortRw(a.rw, b.rw))
}

function calcAge(birthDate: string) {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function normalizeGender(g?: string) {
  if (!g) return '-'
  if (g === 'P' || g === 'Perempuan') return 'P'
  if (g === 'L' || g === 'Laki-laki') return 'L'
  return g
}

function countRegisteredPerRw(ctx: MonitoringExportContext) {
  const map: Record<string, number> = {}
  buildResidentsList(ctx).forEach(r => {
    const rw = String(r.rw || '').padStart(2, '0')
    map[rw] = (map[rw] || 0) + 1
  })
  return map
}

function getDistributionForRw(ctx: MonitoringExportContext, rw: string, healthType: string) {
  const dist = { rendah: 0, normal: 0, batas: 0, tinggi: 0 }

  if (healthType === 'nadi') {
    const readings = ctx.healthReadingsDetails[rw] || []
    readings.forEach(reading => {
      if (reading.type !== 'tensi' || !reading.nadi) return
      const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      if (month !== ctx.selectedMonth) return
      const status = ctx.getHealthStatus('nadi', reading.nadi)
      if (status.status === 'Normal') dist.normal++
      else if (status.status === 'Batas') dist.batas++
      else if (status.status === 'Tinggi') dist.tinggi++
      else dist.rendah++
    })
    return dist
  }

  if (healthType === 'imt') {
    Object.entries(ctx.tbbbData).forEach(([nik, records]) => {
      const rec = (records as any[]).find(t => {
        const month = new Date(t.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        return month === ctx.selectedMonth && String(t.rw || '').padStart(2, '0') === rw
      })
      if (!rec?.tinggiBadan || !rec?.beratBadan) return
      const imt = rec.beratBadan / Math.pow(rec.tinggiBadan / 100, 2)
      const status = ctx.getHealthStatus('imt', imt)
      if (status.status === 'Normal') dist.normal++
      else if (status.status === 'Batas') dist.batas++
      else if (status.status === 'Tinggi') dist.tinggi++
      else dist.rendah++
    })
    return dist
  }

  const readings = ctx.healthReadingsDetails[rw] || []
  readings.forEach(reading => {
    if (reading.type !== healthType) return
    const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
    if (month !== ctx.selectedMonth) return
    let value = 0
    if (healthType === 'tensi') value = reading.sistolik || 0
    else if (healthType === 'kolesterol') value = reading.total || 0
    else value = reading.nilai || 0
    const status = ctx.getHealthStatus(healthType, value, reading.jenisKelamin)
    if (status.status === 'Normal') dist.normal++
    else if (status.status === 'Batas') dist.batas++
    else if (status.status === 'Tinggi') dist.tinggi++
    else dist.rendah++
  })
  return dist
}

function statusToKey(status: HealthStatus): keyof typeof distPlaceholder {
  const map: Record<HealthStatus, keyof typeof distPlaceholder> = {
    Rendah: 'rendah', Normal: 'normal', Batas: 'batas', Tinggi: 'tinggi',
  }
  return map[status]
}
const distPlaceholder = { rendah: 0, normal: 0, batas: 0, tinggi: 0 }

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder()
  })
  row.height = 22
}

function styleDataRow(row: ExcelJS.Row, alt: boolean) {
  row.eachCell(cell => {
    if (alt) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_FILL } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = thinBorder()
    cell.font = { size: 10 }
  })
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFD1D5DB' } }
  return { top: s, left: s, bottom: s, right: s }
}

function applyHealthCellColor(cell: ExcelJS.Cell, status: HealthStatus) {
  const c = CAT_COLORS[status]
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } }
  cell.font = { bold: true, color: { argb: c.font }, size: 10 }
}

function chartToBase64(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}

function drawBarChart(title: string, labels: string[], datasets: { label: string; data: number[]; color: string }[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 360
  const g = canvas.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = '#1f2937'
  g.font = 'bold 14px Arial'
  g.fillText(title, 20, 24)

  const padL = 50, padR = 20, padT = 40, padB = 60
  const chartW = canvas.width - padL - padR
  const chartH = canvas.height - padT - padB
  const maxVal = Math.max(...datasets.flatMap(d => d.data), 1)
  const groupW = chartW / labels.length
  const barW = Math.min(24, groupW / (datasets.length + 1))

  labels.forEach((label, i) => {
    datasets.forEach((ds, j) => {
      const val = ds.data[i] || 0
      const h = (val / maxVal) * chartH
      const x = padL + i * groupW + j * barW + 8
      const y = padT + chartH - h
      g.fillStyle = ds.color
      g.fillRect(x, y, barW, h)
    })
    g.fillStyle = '#374151'
    g.font = '10px Arial'
    g.save()
    g.translate(padL + i * groupW + groupW / 2, canvas.height - 20)
    g.rotate(-0.4)
    g.fillText(`RW ${label}`, 0, 0)
    g.restore()
  })

  datasets.forEach((ds, i) => {
    g.fillStyle = ds.color
    g.fillRect(20, 40 + i * 16, 12, 12)
    g.fillStyle = '#374151'
    g.font = '10px Arial'
    g.fillText(ds.label, 36, 50 + i * 16)
  })

  return chartToBase64(canvas)
}

function drawLineChart(title: string, labels: string[], datasets: { label: string; data: number[]; color: string }[]) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 300
  const g = canvas.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, canvas.width, canvas.height)
  g.fillStyle = '#1f2937'
  g.font = 'bold 13px Arial'
  g.fillText(title, 20, 22)

  const padL = 50, padR = 20, padT = 36, padB = 50
  const chartW = canvas.width - padL - padR
  const chartH = canvas.height - padT - padB
  const maxVal = Math.max(...datasets.flatMap(d => d.data), 1)

  datasets.forEach(ds => {
    g.strokeStyle = ds.color
    g.lineWidth = 2
    g.beginPath()
    ds.data.forEach((val, i) => {
      const x = padL + (i / Math.max(labels.length - 1, 1)) * chartW
      const y = padT + chartH - (val / maxVal) * chartH
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    })
    g.stroke()
  })

  labels.forEach((label, i) => {
    const x = padL + (i / Math.max(labels.length - 1, 1)) * chartW
    g.fillStyle = '#6b7280'
    g.font = '9px Arial'
    g.fillText(label, x - 12, canvas.height - 20)
  })

  datasets.forEach((ds, i) => {
    g.fillStyle = ds.color
    g.fillRect(20, 34 + i * 14, 10, 10)
    g.fillStyle = '#374151'
    g.font = '9px Arial'
    g.fillText(ds.label, 34, 43 + i * 14)
  })

  return chartToBase64(canvas)
}

async function addChartImage(sheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, base64: string, row: number) {
  const imageId = workbook.addImage({ base64, extension: 'png' })
  sheet.addImage(imageId, {
    tl: { col: 0, row },
    ext: { width: 680, height: 280 },
  })
}

// ─── Sheet builders ───────────────────────────────────────────────

function sheetDaftarWarga(workbook: ExcelJS.Workbook, ctx: MonitoringExportContext) {
  const sheet = workbook.addWorksheet('Daftar Warga')
  const residents = buildResidentsList(ctx)
  sheet.columns = [
    { header: 'Nama', key: 'nama', width: 24 },
    { header: 'NIK', key: 'nik', width: 22 },
    { header: 'RW', key: 'rw', width: 8 },
    { header: 'RT', key: 'rt', width: 8 },
    { header: 'Tgl Lahir', key: 'birthDate', width: 14 },
    { header: 'Umur', key: 'umur', width: 8 },
    { header: 'Alamat', key: 'alamat', width: 28 },
    { header: 'Jenis Kelamin', key: 'jenisKelamin', width: 14 },
  ]
  styleHeaderRow(sheet.getRow(1))
  residents.forEach((r, i) => {
    const row = sheet.addRow(r)
    styleDataRow(row, i % 2 === 1)
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

function sheetKehadiran(workbook: ExcelJS.Workbook, ctx: MonitoringExportContext) {
  const sheet = workbook.addWorksheet('Kehadiran per RW')
  const registered = countRegisteredPerRw(ctx)
  const rwSorted = [...ctx.rwList].sort(sortRw)

  sheet.addRow(['RW', 'Jumlah Warga Diperiksa', 'Jumlah Warga Terdaftar', 'Target', 'Persentase (%)'])
  styleHeaderRow(sheet.getRow(1))

  const chartLabels: string[] = []
  const chartDiperiksa: number[] = []
  const chartPersen: number[] = []

  rwSorted.forEach((rw, i) => {
    const diperiksa = ctx.attendanceData[rw]?.[ctx.selectedMonth] || 0
    const terdaftar = registered[rw] || 0
    const target = ctx.customTargets[rw] || 0
    const persen = target > 0 ? Math.round((diperiksa / target) * 100) : 0
    const row = sheet.addRow([rw, diperiksa, terdaftar, target, persen])
    styleDataRow(row, i % 2 === 1)
    chartLabels.push(rw)
    chartDiperiksa.push(diperiksa)
    chartPersen.push(persen)
  })

  sheet.columns = [{ width: 8 }, { width: 22 }, { width: 22 }, { width: 10 }, { width: 16 }]
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Add footer total
  const totalDiperiksa = rwSorted.reduce((sum, rw) => sum + (ctx.attendanceData[rw]?.[ctx.selectedMonth] || 0), 0)
  const totalTerdaftar = rwSorted.reduce((sum, rw) => sum + (registered[rw] || 0), 0)
  const totalTarget = rwSorted.reduce((sum, rw) => sum + (ctx.customTargets[rw] || 0), 0)
  const totalPersen = totalTarget > 0 ? Math.round((totalDiperiksa / totalTarget) * 100) : 0

  const footer = sheet.addRow(['Total', totalDiperiksa, totalTerdaftar, totalTarget, totalPersen])
  footer.eachCell(cell => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
    cell.border = thinBorder()
    cell.alignment = { horizontal: 'center' }
  })
}

function sheetTrenBulanan(workbook: ExcelJS.Workbook, ctx: MonitoringExportContext) {
  const sheet = workbook.addWorksheet('Tren Bulanan')
  const rwSorted = [...ctx.rwList].sort(sortRw)
  const headers = ['RW', ...MONTH_NAMES_ID, 'Total']
  sheet.addRow(headers)
  styleHeaderRow(sheet.getRow(1))

  const monthTotals = new Array(12).fill(0)
  rwSorted.forEach((rw, i) => {
    const months = ctx.healthReadings[rw] || {}
    let total = 0
    const rowVals: (string | number)[] = [rw]
    ctx.months.forEach((m, mi) => {
      const v = months[m] || 0
      rowVals.push(v)
      monthTotals[mi] += v
      total += v
    })
    rowVals.push(total)
    const row = sheet.addRow(rowVals)
    styleDataRow(row, i % 2 === 1)
  })

  const footer = sheet.addRow(['Total', ...monthTotals, monthTotals.reduce((a, b) => a + b, 0)])
  footer.eachCell(cell => {
    cell.font = { bold: true, size: 10 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
    cell.border = thinBorder()
    cell.alignment = { horizontal: 'center' }
  })

  sheet.columns = [{ width: 8 }, ...MONTH_NAMES_ID.map(() => ({ width: 10 })), { width: 10 }]
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

function sheetRekapitulasi(workbook: ExcelJS.Workbook, ctx: MonitoringExportContext) {
  const rwSorted = [...ctx.rwList].sort(sortRw)

  // Create 6 separate sheets, one for each exam type
  EXAM_TYPES.forEach(t => {
    const sheet = workbook.addWorksheet(t.label)
    const headers = ['RW', ...CATEGORIES.map(c => CATEGORY_LABELS[c]), 'Total']
    sheet.addRow(headers)
    styleHeaderRow(sheet.getRow(1))

    // Add category colors to header row
    let col = 2
    CATEGORIES.forEach(cat => {
      const cell = sheet.getRow(1).getCell(col)
      const c = CAT_COLORS[cat]
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } }
      cell.font = { bold: true, color: { argb: c.font }, size: 10 }
      cell.alignment = { horizontal: 'center' }
      cell.border = thinBorder()
      col++
    })

    const colTotals = new Array(CATEGORIES.length).fill(0)

    rwSorted.forEach((rw, ri) => {
      const dist = getDistributionForRw(ctx, rw, t.key)
      const rowVals = CATEGORIES.map(cat => dist[statusToKey(cat)])
      const rowTotal = rowVals.reduce((a, b) => a + b, 0)
      const row = sheet.addRow([rw, ...rowVals, rowTotal])
      styleDataRow(row, ri % 2 === 1)

      // Apply category colors to data cells
      let cIdx = 2
      CATEGORIES.forEach(cat => {
        const cell = row.getCell(cIdx)
        const c = CAT_COLORS[cat]
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fill } }
        cell.font = { bold: true, color: { argb: c.font }, size: 10 }
        cIdx++
      })

      rowVals.forEach((v, i) => { colTotals[i] += v })
    })

    // Add footer total
    const footer = sheet.addRow(['Total', ...colTotals, colTotals.reduce((a, b) => a + b, 0)])
    footer.eachCell(cell => {
      cell.font = { bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
      cell.border = thinBorder()
      cell.alignment = { horizontal: 'center' }
    })

    sheet.getColumn(1).width = 8
    sheet.columns = [{ width: 8 }, ...CATEGORIES.map(() => ({ width: 14 })), { width: 10 }]
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  })
}

function sheetDataKesehatan(workbook: ExcelJS.Workbook, ctx: MonitoringExportContext) {
  const sheet = workbook.addWorksheet('Data Kesehatan Warga')
  const headers = ['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'Jenis Kelamin', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'Nadi']
  sheet.addRow(headers)
  styleHeaderRow(sheet.getRow(1))

  const healthCols: { idx: number; type: string; field: string }[] = [
    { idx: 12, type: 'tensi', field: 'td' },
    { idx: 13, type: 'guladarah', field: 'gds' },
    { idx: 14, type: 'imt', field: 'imt' },
    { idx: 15, type: 'asamurat', field: 'ua' },
    { idx: 16, type: 'kolesterol', field: 'col' },
    { idx: 17, type: 'nadi', field: 'nadi' },
  ]

  const sorted = [...ctx.tableData].sort((a, b) => sortRw(a.rw, b.rw))
  sorted.forEach((row, i) => {
    const excelRow = sheet.addRow([
      row.nama, row.nik, row.rw, row.rt, row.tglLahir, row.umur, row.alamat, row.jenisKelamin,
      row.tb, row.bb, row.lp, row.td, row.gds, row.imt, row.ua, row.col, row.nadi,
    ])
    styleDataRow(excelRow, i % 2 === 1)
    healthCols.forEach(({ idx, type, field }) => {
      const valStr = String(row[field] ?? '')
      if (!valStr || valStr === '-') return
      const numVal = field === 'td' ? parseInt(valStr.split('/')[0]) : parseFloat(valStr)
      if (isNaN(numVal)) return
      const { status } = ctx.getHealthStatus(type, numVal, row.jenisKelamin)
      applyHealthCellColor(excelRow.getCell(idx), status)
    })
  })

  sheet.columns = headers.map((_, i) => ({ width: i === 0 ? 22 : i === 6 ? 26 : 10 }))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

// ─── Public exports ───────────────────────────────────────────────

export async function exportMonitoringExcel(ctx: MonitoringExportContext) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'InterPulse'
  workbook.created = new Date()

  sheetDaftarWarga(workbook, ctx)
  sheetKehadiran(workbook, ctx)
  sheetTrenBulanan(workbook, ctx)
  sheetRekapitulasi(workbook, ctx)
  sheetDataKesehatan(workbook, ctx)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = getFileName(ctx, 'xlsx')
  a.click()
  URL.revokeObjectURL(url)
}

export function exportMonitoringPDF(ctx: MonitoringExportContext) {
  const doc = new jsPDF({ orientation: 'landscape' })
  const kelurahan = ctx.kelurahan
  const monthName = MONTH_NAMES_ID[ctx.months.indexOf(ctx.selectedMonth)] || ctx.selectedMonth
  const headStyle = { fillColor: [79, 70, 229] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const }
  const altStyle = { fillColor: [238, 242, 255] as [number, number, number] }

  const addHeader = (title: string) => {
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 297, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Laporan Monitoring Kesehatan', 148, 9, { align: 'center' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} | ${monthName} ${ctx.year}`, 148, 16, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 30)
  }

  // 1. Daftar Warga
  addHeader('1. Daftar Warga')
  const residents = buildResidentsList(ctx)
  autoTable(doc, {
    startY: 34,
    head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P']],
    body: residents.map(r => [r.nama, r.nik, r.rw, r.rt, r.birthDate, r.umur, r.alamat, r.jenisKelamin]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: headStyle,
    alternateRowStyles: altStyle,
  })

  // 2. Kehadiran per RW
  doc.addPage()
  addHeader('2. Kehadiran per RW')
  const registered = countRegisteredPerRw(ctx)
  const rwSorted = [...ctx.rwList].sort(sortRw)
  autoTable(doc, {
    startY: 34,
    head: [['RW', 'Diperiksa', 'Terdaftar', 'Target', 'Persentase (%)']],
    body: rwSorted.map(rw => {
      const diperiksa = ctx.attendanceData[rw]?.[ctx.selectedMonth] || 0
      const target = ctx.customTargets[rw] || 0
      return [rw, diperiksa, registered[rw] || 0, target, target > 0 ? Math.round((diperiksa / target) * 100) : 0]
    }),
    styles: { fontSize: 9 },
    headStyles: headStyle,
    alternateRowStyles: altStyle,
  })

  // 3. Tren Bulanan
  doc.addPage()
  addHeader('3. Tren Bulanan')
  const monthTotals = new Array(12).fill(0)
  const trenBody = rwSorted.map(rw => {
    const months = ctx.healthReadings[rw] || {}
    let total = 0
    const vals = ctx.months.map((m, mi) => {
      const v = months[m] || 0
      monthTotals[mi] += v
      total += v
      return v
    })
    return [rw, ...vals, total]
  })
  trenBody.push(['Total', ...monthTotals, monthTotals.reduce((a, b) => a + b, 0)])
  autoTable(doc, {
    startY: 34,
    head: [['RW', ...MONTH_NAMES_ID.map(m => m.slice(0, 3)), 'Total']],
    body: trenBody,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: headStyle,
    alternateRowStyles: altStyle,
  })

  // 4. Rekapitulasi
  doc.addPage()
  addHeader('4. Rekapitulasi Hasil Pemeriksaan')
  const rekapHead = ['RW', ...EXAM_TYPES.flatMap(t => CATEGORIES.map(c => `${t.label.slice(0, 4)}-${CATEGORY_LABELS[c].slice(0, 5)}`)), 'Total']
  const rekapBody = rwSorted.map(rw => {
    const vals: number[] = []
    EXAM_TYPES.forEach(t => {
      const dist = getDistributionForRw(ctx, rw, t.key)
      CATEGORIES.forEach(c => vals.push(dist[statusToKey(c)]))
    })
    return [rw, ...vals, vals.reduce((a, b) => a + b, 0)]
  })
  autoTable(doc, {
    startY: 34,
    head: [rekapHead],
    body: rekapBody,
    styles: { fontSize: 5, cellPadding: 1 },
    headStyles: headStyle,
    alternateRowStyles: altStyle,
  })

  // 5. Data Kesehatan Warga
  doc.addPage()
  addHeader('5. Data Kesehatan Warga')
  const sorted = [...ctx.tableData].sort((a, b) => sortRw(a.rw, b.rw))
  const colTypePDF: Record<number, string> = { 11: 'tensi', 12: 'guladarah', 13: 'imt', 14: 'asamurat', 15: 'kolesterol', 16: 'nadi' }
  const statusBgPDF: Record<string, [number, number, number]> = {
    Rendah: CAT_COLORS.Rendah.pdf, Normal: CAT_COLORS.Normal.pdf,
    Batas: CAT_COLORS.Batas.pdf, Tinggi: CAT_COLORS.Tinggi.pdf,
  }
  const statusTxtPDF: Record<string, [number, number, number]> = {
    Rendah: [29, 78, 216], Normal: [21, 128, 61], Batas: [161, 98, 7], Tinggi: [185, 28, 28],
  }

  autoTable(doc, {
    startY: 34,
    head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']],
    body: sorted.map(r => [r.nama, r.nik, r.rw, r.rt, r.tglLahir, r.umur, r.alamat, r.jenisKelamin, r.tb, r.bb, r.lp, r.td, r.gds, r.imt, r.ua, r.col, r.nadi]),
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: headStyle,
    alternateRowStyles: altStyle,
    didParseCell: (data: any) => {
      if (data.section !== 'body') return
      const type = colTypePDF[data.column.index]
      if (!type) return
      const val = String(data.cell.raw ?? '')
      if (!val || val === '-') return
      const numVal = data.column.index === 11 ? parseInt(val.split('/')[0]) : parseFloat(val)
      if (isNaN(numVal)) return
      const rowGender = sorted[data.row.index]?.jenisKelamin
      const { status } = ctx.getHealthStatus(type, numVal, rowGender)
      if (statusBgPDF[status]) {
        data.cell.styles.fillColor = statusBgPDF[status]
        data.cell.styles.textColor = statusTxtPDF[status]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  doc.save(getFileName(ctx, 'pdf'))
}
