'use client'

import { useState, useEffect, useCallback } from 'react'
import BackButton from '@/components/BackButton'
import CharacterAvatar from '@/components/CharacterAvatar'
import { User, Activity, TrendingUp, TrendingDown } from 'lucide-react'

export default function PosturTubuh() {
  const [tinggi, setTinggi] = useState<number>(170)
  const [berat, setBerat] = useState<number>(65)
  const [jenisKelamin, setJenisKelamin] = useState<'cowok' | 'cewek'>('cowok')
  const [bmi, setBmi] = useState<number>(0)
  const [kategori, setKategori] = useState<string>('')
  const [warna, setWarna] = useState<string>('')
  const [animationKey, setAnimationKey] = useState<number>(0)

  const calculateBMI = useCallback(() => {
    if (tinggi > 0 && berat > 0) {
      const tinggiMeter = tinggi / 100
      const bmiValue = berat / (tinggiMeter * tinggiMeter)
      setBmi(parseFloat(bmiValue.toFixed(1)))

      if (bmiValue < 18.5) {
        setKategori('Kurus')
        setWarna('text-blue-500')
      } else if (bmiValue >= 18.5 && bmiValue < 25) {
        setKategori('Normal')
        setWarna('text-green-500')
      } else if (bmiValue >= 25 && bmiValue < 30) {
        setKategori('Gemuk')
        setWarna('text-orange-500')
      } else {
        setKategori('Obesitas')
        setWarna('text-red-500')
      }
      
      setAnimationKey(prev => prev + 1)
    }
  }, [tinggi, berat, jenisKelamin])

  useEffect(() => {
    calculateBMI()
  }, [calculateBMI])

  const getBodyWidth = () => {
    if (bmi < 18.5) return 60
    if (bmi < 25) return 80
    if (bmi < 30) return 100
    return 120
  }

  const getBodyHeight = () => {
    const baseHeight = 200
    const ratio = tinggi / 170
    return baseHeight * ratio
  }

  const getHeadSize = () => {
    return 40
  }

  const getNeckWidth = () => {
    if (bmi < 18.5) return 15
    if (bmi < 25) return 20
    if (bmi < 30) return 25
    return 30
  }

  const getArmWidth = () => {
    if (bmi < 18.5) return 12
    if (bmi < 25) return 16
    if (bmi < 30) return 20
    return 24
  }

  const getLegWidth = () => {
    if (bmi < 18.5) return 18
    if (bmi < 25) return 24
    if (bmi < 30) return 30
    return 36
  }

  const getBodyColor = () => {
    if (bmi < 18.5) return '#60a5fa'
    if (bmi < 25) return '#34d399'
    if (bmi < 30) return '#fb923c'
    return '#f87171'
  }

  const bodyWidth = getBodyWidth()
  const bodyHeight = getBodyHeight()
  const headSize = getHeadSize()
  const neckWidth = getNeckWidth()
  const armWidth = getArmWidth()
  const legWidth = getLegWidth()
  const bodyColor = getBodyColor()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            AI Visualisasi Postur Tubuh
          </h1>
          <p className="text-gray-600">Lihat visualisasi postur tubuh Anda berdasarkan tinggi dan berat badan</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-purple-600" />
              Input Data Tubuh
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tinggi Badan (cm)
                </label>
                <input
                  type="range"
                  min="100"
                  max="220"
                  value={tinggi}
                  onChange={(e) => setTinggi(Number(e.target.value))}
                  aria-label="Tinggi Badan"
                  className="w-full h-3 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">100 cm</span>
                  <span className="text-2xl font-bold text-purple-600">{tinggi} cm</span>
                  <span className="text-sm text-gray-500">220 cm</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Berat Badan (kg)
                </label>
                <input
                  type="range"
                  min="30"
                  max="150"
                  value={berat}
                  onChange={(e) => setBerat(Number(e.target.value))}
                  aria-label="Berat Badan"
                  className="w-full h-3 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">30 kg</span>
                  <span className="text-2xl font-bold text-pink-600">{berat} kg</span>
                  <span className="text-sm text-gray-500">150 kg</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Jenis Kelamin
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setJenisKelamin('cowok')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      jenisKelamin === 'cowok'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👨 Cowok
                  </button>
                  <button
                    onClick={() => setJenisKelamin('cewek')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      jenisKelamin === 'cewek'
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    👩 Cewek
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">BMI Anda</p>
                    <p className="text-4xl font-bold text-gray-800">{bmi}</p>
                  </div>
                  <Activity className="w-12 h-12 text-purple-600" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">Kategori:</p>
                  <p className={`text-xl font-bold ${warna}`}>{kategori}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-gray-700">Kategori BMI:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Kurus: &lt; 18.5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Normal: 18.5-24.9</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Gemuk: 25-29.9</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600">Obesitas: ≥ 30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Activity className="w-6 h-6 text-pink-600" />
              Visualisasi Postur
            </h2>

            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-b from-gray-50 to-white rounded-xl p-8">
              <div className="relative flex items-end justify-center h-[450px]">
                <CharacterAvatar 
                  gender={jenisKelamin}
                  bmi={bmi}
                  bodyColor={bodyColor}
                  animationKey={animationKey}
                />
              </div>

              <div className="mt-6 text-center">
                <div 
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-full ${warna} bg-opacity-10 border-2 border-custom`}
                  style={{ '--border-color': bodyColor } as React.CSSProperties}
                >
                  {bmi < 18.5 && <TrendingDown className="w-5 h-5" />}
                  {bmi >= 18.5 && bmi < 25 && <Activity className="w-5 h-5" />}
                  {bmi >= 25 && <TrendingUp className="w-5 h-5" />}
                  <span className="font-bold text-lg">{kategori}</span>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {bmi < 18.5 && 'Tubuh cenderung kurus, pertimbangkan untuk menambah asupan nutrisi'}
                  {bmi >= 18.5 && bmi < 25 && 'Postur tubuh ideal! Pertahankan pola hidup sehat Anda'}
                  {bmi >= 25 && bmi < 30 && 'Tubuh cenderung gemuk, pertimbangkan diet seimbang dan olahraga'}
                  {bmi >= 30 && 'Obesitas terdeteksi, konsultasikan dengan ahli kesehatan'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💡 Tips Berdasarkan Postur Anda</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {bmi < 18.5 && (
              <>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 mb-2">🍽️ Nutrisi</p>
                  <p className="text-sm text-blue-700">Tingkatkan asupan kalori dengan makanan bergizi tinggi</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 mb-2">💪 Latihan</p>
                  <p className="text-sm text-blue-700">Fokus pada latihan kekuatan untuk membangun massa otot</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-semibold text-blue-800 mb-2">😴 Istirahat</p>
                  <p className="text-sm text-blue-700">Pastikan tidur cukup 7-9 jam untuk pemulihan optimal</p>
                </div>
              </>
            )}
            {bmi >= 18.5 && bmi < 25 && (
              <>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-semibold text-green-800 mb-2">✅ Pertahankan</p>
                  <p className="text-sm text-green-700">Lanjutkan pola makan seimbang yang sudah baik</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-semibold text-green-800 mb-2">🏃 Aktif</p>
                  <p className="text-sm text-green-700">Tetap aktif dengan olahraga rutin 3-5x seminggu</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="font-semibold text-green-800 mb-2">🧘 Seimbang</p>
                  <p className="text-sm text-green-700">Jaga keseimbangan antara aktivitas dan istirahat</p>
                </div>
              </>
            )}
            {bmi >= 25 && (
              <>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="font-semibold text-orange-800 mb-2">🥗 Diet Sehat</p>
                  <p className="text-sm text-orange-700">Kurangi kalori dengan makanan rendah lemak dan gula</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="font-semibold text-orange-800 mb-2">🏋️ Kardio</p>
                  <p className="text-sm text-orange-700">Tingkatkan aktivitas kardio untuk membakar kalori</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="font-semibold text-orange-800 mb-2">👨‍⚕️ Konsultasi</p>
                  <p className="text-sm text-orange-700">Pertimbangkan konsultasi dengan ahli gizi</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
          transition: all 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
          transition: all 0.2s;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.5);
        }
        .border-custom {
          border-color: var(--border-color) !important;
        }
      `}</style>
    </div>
  )
}
