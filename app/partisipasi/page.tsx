'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, Calendar } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const rwTargets: Record<string, number> = {
  '01': 32, '02': 65, '03': 60, '04': 60, '05': 70, '06': 33
}

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

export default function PartisipasiPage() {
  const [elderlyAttendance, setElderlyAttendance] = useState<Record<string, Record<string, number>>>({})
  const [selectedMonth, setSelectedMonth] = useState('april')

  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data: Record<string, Record<string, number>> = {}
      Object.keys(rwTargets).forEach(rw => {
        data[rw] = {}
        months.forEach(m => { data[rw][m] = 0 })
      })
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        const rw = d.rw
        if (rw && data[rw]) {
          const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (data[rw][month] !== undefined) data[rw][month]++
        }
      })
      setElderlyAttendance(data)
    })
    return () => unsubscribe()
  }, [])

  const totalTarget = Object.values(rwTargets).reduce((a, b) => a + b, 0)
  const totalAttendance = Object.entries(elderlyAttendance).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalAttendance / totalTarget) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-green-200 hover:text-white text-sm">← Beranda</Link>
        </div>
        <h1 className="text-2xl font-bold">Partisipasi</h1>
        <p className="text-green-100 text-sm mt-1">Trafik kehadiran warga Posbindu</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Month Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">Pilih Bulan</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${selectedMonth === m ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {monthLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-4 text-white">
          <h3 className="font-semibold mb-3">Ringkasan - {selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-green-100 text-xs">Total Hadir</p>
              <p className="text-2xl font-bold">{totalAttendance}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs">Target</p>
              <p className="text-2xl font-bold">{totalTarget}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs">Capaian</p>
              <p className="text-2xl font-bold">{overallPct}%</p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Per-RW Cards */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" />
            Partisipasi per RW
          </h3>
          {Object.entries(rwTargets).map(([rw, target]) => {
            const hadir = elderlyAttendance[rw]?.[selectedMonth] || 0
            const pct = target > 0 ? Math.round((hadir / target) * 100) : 0
            const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            const badgeColor = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            return (
              <div key={rw} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">RW {rw}</p>
                      <p className="text-xs text-gray-500">{hadir} / {target} warga</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeColor}`}>{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Trend info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">Trafik Kehadiran</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {months.map(m => {
              const total = Object.entries(elderlyAttendance).reduce((s, [, d]) => s + (d[m] || 0), 0)
              const maxVal = Math.max(...months.map(mo => Object.entries(elderlyAttendance).reduce((s, [, d]) => s + (d[mo] || 0), 0)), 1)
              const height = Math.round((total / maxVal) * 60)
              return (
                <div key={m} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-500">{total}</span>
                  <div className="w-full bg-gray-100 rounded-t" style={{ height: 64 }}>
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${m === selectedMonth ? 'bg-green-500' : 'bg-green-200'}`}
                      style={{ height, marginTop: 64 - height }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400">{monthLabels[m]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
