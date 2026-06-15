'use client'

import Plot from 'react-plotly.js'

interface MonthlyChartProps {
  monthlyData: {
    bulan: string
    totalHadir: number
    totalTarget: number
    capaian: number
  }[]
}

export default function MonthlyChart({ monthlyData }: MonthlyChartProps) {
  const months = monthlyData.map(d => d.bulan)
  const totalHadir = monthlyData.map(d => d.totalHadir)
  const totalTarget = monthlyData.map(d => d.totalTarget)
  const capaian = monthlyData.map(d => d.capaian)

  // Grafik 1: Line Chart - Tren Kehadiran Per Bulan
  const trace1 = {
    x: months,
    y: totalHadir,
    name: 'Total Hadir',
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { color: '#4f46e5', width: 3 },
    marker: { size: 8, color: '#4f46e5' },
    fill: 'tozeroy' as const,
    fillcolor: 'rgba(79, 70, 229, 0.1)'
  }

  const layout1 = {
    title: { text: 'Tren Kehadiran Warga Per Bulan' },
    xaxis: { title: { text: 'Bulan' } },
    yaxis: { title: { text: 'Jumlah Warga' } },
    hovermode: 'x unified' as const,
    plot_bgcolor: 'rgba(255,255,255,0.9)',
    paper_bgcolor: 'rgba(255,255,255,0.9)',
    autosize: true,
    margin: { t: 50, b: 50, l: 50, r: 20 }
  }

  // Grafik 2: Multi-line Chart - Total Hadir vs Target
  const trace2a = {
    x: months,
    y: totalHadir,
    name: 'Total Hadir',
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { color: '#4f46e5', width: 3 },
    marker: { size: 8 }
  }

  const trace2b = {
    x: months,
    y: totalTarget,
    name: 'Total Target',
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { color: '#10b981', width: 3, dash: 'dash' as const },
    marker: { size: 8 }
  }

  const layout2 = {
    title: { text: 'Total Hadir vs Target Per Bulan' },
    xaxis: { title: { text: 'Bulan' } },
    yaxis: { title: { text: 'Jumlah Warga' } },
    hovermode: 'x unified' as const,
    plot_bgcolor: 'rgba(255,255,255,0.9)',
    paper_bgcolor: 'rgba(255,255,255,0.9)',
    autosize: true,
    margin: { t: 50, b: 50, l: 50, r: 20 }
  }

  // Grafik 3: Area Chart - Capaian Persentase
  const trace3 = {
    x: months,
    y: capaian,
    name: 'Capaian (%)',
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { color: '#f59e0b', width: 3 },
    marker: { size: 8, color: '#f59e0b' },
    fill: 'tozeroy' as const,
    fillcolor: 'rgba(245, 158, 11, 0.2)'
  }

  const layout3 = {
    title: { text: 'Capaian Persentase Per Bulan' },
    xaxis: { title: { text: 'Bulan' } },
    yaxis: { title: { text: 'Capaian (%)' } },
    hovermode: 'x unified' as const,
    plot_bgcolor: 'rgba(255,255,255,0.9)',
    paper_bgcolor: 'rgba(255,255,255,0.9)',
    autosize: true,
    margin: { t: 50, b: 50, l: 50, r: 20 }
  }

  // Grafik 4: Bar Chart - Perbandingan Bulanan
  const trace4a = {
    x: months,
    y: totalHadir,
    name: 'Total Hadir',
    type: 'bar' as const,
    marker: { color: '#4f46e5' }
  }

  const trace4b = {
    x: months,
    y: totalTarget,
    name: 'Total Target',
    type: 'bar' as const,
    marker: { color: '#10b981' }
  }

  const layout4 = {
    title: { text: 'Perbandingan Kehadiran Per Bulan' },
    xaxis: { title: { text: 'Bulan' } },
    yaxis: { title: { text: 'Jumlah Warga' } },
    barmode: 'group' as const,
    plot_bgcolor: 'rgba(255,255,255,0.9)',
    paper_bgcolor: 'rgba(255,255,255,0.9)',
    autosize: true,
    margin: { t: 50, b: 50, l: 50, r: 20 }
  }

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Plot
          data={[trace1]}
          layout={layout1}
          config={config}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Plot
          data={[trace2a, trace2b]}
          layout={layout2}
          config={config}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Plot
          data={[trace3]}
          layout={layout3}
          config={config}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <Plot
          data={[trace4a, trace4b]}
          layout={layout4}
          config={config}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  )
}
