'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import BackButton from '@/components/BackButton'
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Stethoscope,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const STORAGE_KEY = 'fasca_mock_riwayat'

type FormData = {
  sistolik: string
  diastolik: string
  guladarah: string
  asamurat: string
  kolesterol_total: string
}

type CheckResult = {
  label: string
  value: string
  status: 'aman' | 'tidak aman'
  title: string
  advice: string
}

type RiwayatEntry = {
  id: string
  timestamp: string
  results: CheckResult[]
}

const emptyForm: FormData = {
  sistolik: '',
  diastolik: '',
  guladarah: '',
  asamurat: '',
  kolesterol_total: '',
}

function validateTD(sys: number, dia: number): Omit<CheckResult, 'label' | 'value'> {
  if (sys >= 120 && sys <= 130 && dia >= 70 && dia <= 85) {
    return { status: 'aman', title: 'Normal', advice: 'Tekanan darah Anda dalam batas normal. Pertahankan pola hidup sehat.' }
  }
  if (sys < 90 || dia < 60) {
    return { status: 'tidak aman', title: 'Rendah', advice: 'Tekanan darah rendah. Perbanyak istirahat dan konsumsi cairan.' }
  }
  if (sys >= 130 && sys <= 139 && dia >= 85 && dia <= 89) {
    return { status: 'tidak aman', title: 'Pra-Hipertensi', advice: 'Tekanan darah mendekati tinggi. Kurangi garam dan pantau rutin.' }
  }
  if (sys > 140 || dia > 90) {
    return { status: 'tidak aman', title: 'Hipertensi', advice: 'Tekanan darah tinggi. Segera konsultasi ke fasilitas kesehatan.' }
  }
  return { status: 'tidak aman', title: 'Perlu Monitoring', advice: 'Nilai perlu dipantau lebih lanjut.' }
}

function validateGDS(nilai: number): Omit<CheckResult, 'label' | 'value'> {
  if (nilai < 100) {
    return { status: 'aman', title: 'Normal', advice: 'Gula darah dalam batas normal. Pertahankan pola makan sehat.' }
  }
  if (nilai < 126) {
    return { status: 'tidak aman', title: 'Pra-Diabetes', advice: 'Gula darah di atas normal. Kurangi gula dan karbohidrat.' }
  }
  return { status: 'tidak aman', title: 'Tinggi', advice: 'Gula darah tinggi. Segera konsultasi ke fasilitas kesehatan.' }
}

function validateAsamUrat(nilai: number, gender: string): Omit<CheckResult, 'label' | 'value'> {
  const isMale = gender === 'Laki-laki' || gender === 'L'
  const threshold = isMale ? 7 : 6
  if (nilai <= threshold) {
    return { status: 'aman', title: 'Normal', advice: 'Asam urat dalam batas normal. Pertahankan pola makan sehat.' }
  }
  return { status: 'tidak aman', title: 'Tinggi', advice: 'Asam urat tinggi. Kurangi makanan berpurin dan konsultasi dokter.' }
}

function validateKolesterol(total: number): Omit<CheckResult, 'label' | 'value'> {
  if (total < 200) {
    return { status: 'aman', title: 'Normal', advice: 'Kolesterol dalam batas normal. Pertahankan pola makan sehat.' }
  }
  return { status: 'tidak aman', title: 'Tinggi', advice: 'Kolesterol tinggi. Kurangi makanan berlemak dan konsultasi dokter.' }
}

function loadRiwayat(): RiwayatEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRiwayat(entries: RiwayatEntry[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export default function FascaCatatan() {
  const router = useRouter()
  const { userProfile, isAdmin, loading } = useAuth()
  const [form, setForm] = useState<FormData>(emptyForm)
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [riwayat, setRiwayat] = useState<RiwayatEntry[]>([])
  const [showRiwayat, setShowRiwayat] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setRiwayat(loadRiwayat())
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Halaman untuk Warga</h2>
          <p className="text-gray-600 mb-6">FASCA ini khusus untuk pengecekan mandiri warga.</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const checked: CheckResult[] = []

    if (form.sistolik && form.diastolik) {
      const sys = parseInt(form.sistolik)
      const dia = parseInt(form.diastolik)
      if (!isNaN(sys) && !isNaN(dia)) {
        const v = validateTD(sys, dia)
        checked.push({ label: 'Tekanan Darah (TD)', value: `${sys}/${dia} mmHg`, ...v })
      }
    }

    if (form.guladarah) {
      const nilai = parseInt(form.guladarah)
      if (!isNaN(nilai)) {
        const v = validateGDS(nilai)
        checked.push({ label: 'Gula Darah (GDS)', value: `${nilai} mg/dL`, ...v })
      }
    }

    if (form.asamurat) {
      const nilai = parseFloat(form.asamurat)
      if (!isNaN(nilai)) {
        const v = validateAsamUrat(nilai, userProfile?.gender || 'Laki-laki')
        checked.push({ label: 'Asam Urat', value: `${nilai} mg/dL`, ...v })
      }
    }

    if (form.kolesterol_total) {
      const total = parseInt(form.kolesterol_total)
      if (!isNaN(total)) {
        const v = validateKolesterol(total)
        checked.push({ label: 'Kolesterol', value: `${total} mg/dL`, ...v })
      }
    }

    if (checked.length === 0) {
      setSubmitting(false)
      return
    }

    const entry: RiwayatEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      results: checked,
    }

    const updated = [entry, ...loadRiwayat()]
    saveRiwayat(updated)
    setRiwayat(updated)
    setResults(checked)
    setSubmitting(false)
  }

  const handleReset = () => {
    setForm(emptyForm)
    setResults(null)
  }

  const amanCount = results?.filter(r => r.status === 'aman').length ?? 0
  const totalCount = results?.length ?? 0
  const allAman = results && amanCount === totalCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-purple-600" />
              FASCA
            </h1>
            <p className="text-sm text-gray-600">Fasilitas Catatan & Cek Kesehatan Mandiri</p>
          </div>
        </div>

        {!results ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Isi Hasil Pemeriksaan Anda</h2>
            <p className="text-sm text-gray-500">Isi nilai yang Anda ketahui, lalu tekan cek untuk melihat apakah aman.</p>

            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                <span>❤️</span> Tekanan Darah (TD)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sistolik (atas)</label>
                  <input
                    type="number"
                    value={form.sistolik}
                    onChange={e => handleChange('sistolik', e.target.value)}
                    placeholder="120"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">mmHg</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diastolik (bawah)</label>
                  <input
                    type="number"
                    value={form.diastolik}
                    onChange={e => handleChange('diastolik', e.target.value)}
                    placeholder="80"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-400 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">mmHg</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                <span>🍯</span> Gula Darah Sewaktu (GDS)
              </h3>
              <input
                type="number"
                value={form.guladarah}
                onChange={e => handleChange('guladarah', e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">mg/dL — normal &lt; 100</p>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                <span>🔥</span> Asam Urat
              </h3>
              <input
                type="number"
                step="0.1"
                value={form.asamurat}
                onChange={e => handleChange('asamurat', e.target.value)}
                placeholder="6"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">mg/dL — normal ≤ 7 (L) / ≤ 6 (P)</p>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h3 className="font-bold text-yellow-700 mb-3 flex items-center gap-2">
                <span>🧈</span> Kolesterol Total
              </h3>
              <input
                type="number"
                value={form.kolesterol_total}
                onChange={e => handleChange('kolesterol_total', e.target.value)}
                placeholder="200"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">mg/dL — normal &lt; 200</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? 'Mengecek...' : 'Cek Kesehatan Saya'}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
            <div className={`rounded-2xl p-5 text-center ${allAman ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              {allAman ? (
                <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
              ) : (
                <AlertCircle className="w-14 h-14 text-orange-600 mx-auto mb-3" />
              )}
              <h2 className={`text-xl font-bold mb-1 ${allAman ? 'text-green-700' : 'text-orange-700'}`}>
                {allAman ? 'Semua Nilai Aman' : `${amanCount} dari ${totalCount} Nilai Aman`}
              </h2>
              <p className="text-sm text-gray-600">
                {userProfile?.name ? `Hasil pengecekan untuk ${userProfile.name}` : 'Hasil pengecekan Anda'}
              </p>
            </div>

            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border ${
                  r.status === 'aman' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{r.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{r.value}</p>
                    <p className={`text-sm font-medium mt-1 ${r.status === 'aman' ? 'text-green-700' : 'text-red-700'}`}>
                      {r.title} — {r.status === 'aman' ? '✅ Aman' : '⚠️ Tidak Aman'}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">{r.advice}</p>
                  </div>
                  {r.status === 'aman' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleReset}
              className="w-full py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Cek Ulang
            </button>
          </div>
        )}

        {/* Riwayat sesi */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
          <button
            onClick={() => setShowRiwayat(!showRiwayat)}
            className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-gray-800">Riwayat Sesi Ini</h2>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {riwayat.length} catatan
              </span>
            </div>
            {showRiwayat ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {showRiwayat && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
              {riwayat.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada riwayat pengecekan di sesi ini.</p>
              ) : (
                riwayat.map(entry => (
                  <div key={entry.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(entry.timestamp).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.results.map((r, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            r.status === 'aman'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {r.label.split(' ')[0]}: {r.status === 'aman' ? 'Aman' : 'Tidak Aman'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
              <p className="text-xs text-gray-400 text-center">
                Riwayat ini hanya tersimpan selama aplikasi terbuka.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
