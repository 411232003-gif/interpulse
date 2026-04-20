'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/components/BackButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, Calendar, Ruler, Weight, Target, Settings, X, Save, Plus, Trash2, Edit3, Trophy, QrCode, Share2, LogOut } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth, UserProfile } from '@/lib/auth-context'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

interface HealthData {
  id: string
  type: string
  value: number
  unit: string
  date: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earned: boolean
  earnedDate?: string
  target: number
  current: number
}

interface ProgressTarget {
  id: string
  title: string
  description: string
  targetValue: number
  currentValue: number
  unit: string
  deadline?: string
}

const defaultProfile: UserProfile = {
  uid: '',
  name: 'Pengguna InterPulse',
  email: 'user@interpulse.com',
  nik: '',
  phone: '+62 812 3456 7890',
  birthDate: '1990-01-01',
  height: 170,
  weight: 65,
  targetWeight: 60,
  gender: 'Laki-laki',
  rt: '001',
  rw: '01',
  kelurahan: 'Kelurahan Contoh',
  role: 'user',
  createdAt: '',
}

export default function Profil() {
  const { userProfile: authProfile, refreshProfile, logout } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile>(defaultProfile)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  // Health Data State
  const [healthData, setHealthData] = useState<HealthData[]>([
    { id: '1', type: 'Berat Badan', value: 65, unit: 'kg', date: '2024-01-15' },
    { id: '2', type: 'Tinggi Badan', value: 170, unit: 'cm', date: '2024-01-15' },
    { id: '3', type: 'Tekanan Darah', value: 120, unit: 'mmHg', date: '2024-01-15' },
  ])
  const [showHealthModal, setShowHealthModal] = useState(false)
  const [editingHealth, setEditingHealth] = useState<HealthData | null>(null)
  const [healthForm, setHealthForm] = useState({ type: '', value: 0, unit: '', date: '' })

  // Achievements State
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: '1', title: 'Konsisten 7 Hari', description: 'Login 7 hari berturut-turut', icon: '🔥', earned: true, earnedDate: '2024-01-15', target: 7, current: 7 },
    { id: '2', title: 'Target Langkah', description: 'Capai 10.000 langkah', icon: '👟', earned: true, earnedDate: '2024-01-10', target: 10000, current: 12000 },
    { id: '3', title: 'Hidrasi Sempurna', description: 'Minum 2.5L air', icon: '💧', earned: false, target: 2500, current: 1800 },
  ])
  const [showAchievementModal, setShowAchievementModal] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [achievementForm, setAchievementForm] = useState({ title: '', description: '', icon: '', target: 0, current: 0 })

  // Progress Targets State
  const [progressTargets, setProgressTargets] = useState<ProgressTarget[]>([
    { id: '1', title: 'Turunkan Berat', description: 'Dari 70kg ke 60kg', targetValue: 60, currentValue: 65, unit: 'kg', deadline: '2024-06-30' },
    { id: '2', title: 'Langkah Harian', description: '10.000 langkah/hari', targetValue: 10000, currentValue: 7500, unit: 'langkah' },
  ])
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [editingTarget, setEditingTarget] = useState<ProgressTarget | null>(null)
  const [targetForm, setTargetForm] = useState({ title: '', description: '', targetValue: 0, currentValue: 0, unit: '', deadline: '' })

  // QR Code URL state
  const [appUrl, setAppUrl] = useState('https://interpulse.app')

  // Sync with auth profile from Firestore
  useEffect(() => {
    setMounted(true)
    setAppUrl(window.location.origin)
    
    if (authProfile) {
      const profileData: UserProfile = {
        uid: authProfile.uid,
        email: authProfile.email,
        nik: authProfile.nik || '',
        name: authProfile.name,
        phone: authProfile.phone,
        birthDate: authProfile.birthDate,
        height: authProfile.height,
        weight: authProfile.weight,
        targetWeight: authProfile.targetWeight,
        gender: authProfile.gender,
        rt: authProfile.rt,
        rw: authProfile.rw,
        kelurahan: authProfile.kelurahan,
        adminKelurahan: authProfile.adminKelurahan || '',
        role: authProfile.role,
        createdAt: authProfile.createdAt
      }
      setProfile(profileData)
      setEditedProfile(profileData)
    }
    
    const savedHealth = localStorage.getItem('healthData')
    const savedAchievements = localStorage.getItem('achievements')
    const savedTargets = localStorage.getItem('progressTargets')
    
    if (savedHealth) setHealthData(JSON.parse(savedHealth))
    if (savedAchievements) setAchievements(JSON.parse(savedAchievements))
    if (savedTargets) setProgressTargets(JSON.parse(savedTargets))
  }, [authProfile])

  // Save local data to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('healthData', JSON.stringify(healthData))
      localStorage.setItem('achievements', JSON.stringify(achievements))
      localStorage.setItem('progressTargets', JSON.stringify(progressTargets))
    }
  }, [healthData, achievements, progressTargets, mounted])

  // Profile CRUD
  const handleEdit = () => {
    setEditedProfile({ ...profile })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!authProfile?.uid) return
    
    setSaving(true)
    try {
      // Update Firestore
      const userRef = doc(db, 'users', authProfile.uid)
      await updateDoc(userRef, {
        name: editedProfile.name,
        phone: editedProfile.phone,
        birthDate: editedProfile.birthDate,
        height: editedProfile.height,
        weight: editedProfile.weight,
        targetWeight: editedProfile.targetWeight,
        gender: editedProfile.gender,
        rt: editedProfile.rt,
        rw: editedProfile.rw,
        kelurahan: editedProfile.kelurahan,
        adminKelurahan: editedProfile.adminKelurahan || ''
      })
      
      setProfile({ ...editedProfile })
      setIsEditing(false)
      await refreshProfile()
      alert('Profil berhasil disimpan!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Gagal menyimpan profil. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile({ ...profile })
    setIsEditing(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleChange = (field: keyof UserProfile, value: string | number) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }))
  }

  // Health Data CRUD
  const handleSaveHealth = () => {
    if (editingHealth) {
      setHealthData(prev => prev.map(h => h.id === editingHealth.id ? { ...h, ...healthForm } : h))
    } else {
      setHealthData(prev => [...prev, { ...healthForm, id: Date.now().toString() }])
    }
    setShowHealthModal(false)
    setEditingHealth(null)
    setHealthForm({ type: '', value: 0, unit: '', date: '' })
  }

  const handleDeleteHealth = (id: string) => {
    setHealthData(prev => prev.filter(h => h.id !== id))
  }

  const handleAddHealth = () => {
    setEditingHealth(null)
    setHealthForm({ type: '', value: 0, unit: '', date: new Date().toISOString().split('T')[0] })
    setShowHealthModal(true)
  }

  const handleEditHealth = (health: HealthData) => {
    setEditingHealth(health)
    setHealthForm({ type: health.type, value: health.value, unit: health.unit, date: health.date })
    setShowHealthModal(true)
  }

  // Achievement CRUD
  const handleSaveAchievement = () => {
    const earned = achievementForm.current >= achievementForm.target
    if (editingAchievement) {
      setAchievements(prev => prev.map(a => a.id === editingAchievement.id ? { 
        ...a, 
        ...achievementForm,
        earned,
        earnedDate: earned && !a.earnedDate ? new Date().toISOString().split('T')[0] : a.earnedDate
      } : a))
    } else {
      setAchievements(prev => [...prev, { 
        ...achievementForm, 
        id: Date.now().toString(),
        earned,
        earnedDate: earned ? new Date().toISOString().split('T')[0] : undefined
      }])
    }
    setShowAchievementModal(false)
    setEditingAchievement(null)
    setAchievementForm({ title: '', description: '', icon: '', target: 0, current: 0 })
  }

  const handleDeleteAchievement = (id: string) => {
    setAchievements(prev => prev.filter(a => a.id !== id))
  }

  const handleAddAchievement = () => {
    setEditingAchievement(null)
    setAchievementForm({ title: '', description: '', icon: '🏆', target: 100, current: 0 })
    setShowAchievementModal(true)
  }

  const handleEditAchievement = (achievement: Achievement) => {
    setEditingAchievement(achievement)
    setAchievementForm({ 
      title: achievement.title, 
      description: achievement.description, 
      icon: achievement.icon, 
      target: achievement.target, 
      current: achievement.current 
    })
    setShowAchievementModal(true)
  }

  // Progress Target CRUD
  const handleSaveTarget = () => {
    if (editingTarget) {
      setProgressTargets(prev => prev.map(t => t.id === editingTarget.id ? { ...t, ...targetForm } : t))
    } else {
      setProgressTargets(prev => [...prev, { ...targetForm, id: Date.now().toString() }])
    }
    setShowTargetModal(false)
    setEditingTarget(null)
    setTargetForm({ title: '', description: '', targetValue: 0, currentValue: 0, unit: '', deadline: '' })
  }

  const handleDeleteTarget = (id: string) => {
    setProgressTargets(prev => prev.filter(t => t.id !== id))
  }

  const handleAddTarget = () => {
    setEditingTarget(null)
    setTargetForm({ title: '', description: '', targetValue: 0, currentValue: 0, unit: '', deadline: '' })
    setShowTargetModal(true)
  }

  const handleEditTarget = (target: ProgressTarget) => {
    setEditingTarget(target)
    setTargetForm({ 
      title: target.title, 
      description: target.description, 
      targetValue: target.targetValue, 
      currentValue: target.currentValue, 
      unit: target.unit, 
      deadline: target.deadline || '' 
    })
    setShowTargetModal(true)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (weight: number, height: number) => {
    const heightInMeters = height / 100
    return (weight / (heightInMeters * heightInMeters)).toFixed(1)
  }

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { status: 'Kurus', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (bmi < 25) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
    if (bmi < 30) return { status: 'Berlebih', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { status: 'Obesitas', color: 'text-red-600', bg: 'bg-red-100' }
  }

  // Dynamic Statistics
  const earnedCount = achievements.filter(a => a.earned).length
  const avgProgressValue = progressTargets.length > 0 
    ? Math.round(progressTargets.reduce((acc, t) => acc + Math.min((t.currentValue / t.targetValue) * 100, 100), 0) / progressTargets.length)
    : 0

  // BMI Calculation
  const bmi = parseFloat(calculateBMI(profile.weight, profile.height))
  const bmiStatus = getBMIStatus(bmi)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil Saya</h1>
          <p className="text-gray-600">Kelola informasi dan pengaturan akun Anda</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Informasi Pribadi */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Informasi Pribadi</CardTitle>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" /> Batal
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Settings className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4 mr-2" /> Keluar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="text-sm font-medium text-gray-700 mb-1 block">Nama</label>
                      <input id="edit-name" type="text" value={editedProfile.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label htmlFor="edit-email" className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                      <input id="edit-email" type="email" value={editedProfile.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label htmlFor="edit-phone" className="text-sm font-medium text-gray-700 mb-1 block">Telepon</label>
                      <input id="edit-phone" type="tel" value={editedProfile.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label htmlFor="edit-birthDate" className="text-sm font-medium text-gray-700 mb-1 block">Tanggal Lahir</label>
                      <input id="edit-birthDate" type="date" value={editedProfile.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label htmlFor="edit-gender" className="text-sm font-medium text-gray-700 mb-1 block">Jenis Kelamin</label>
                      <select id="edit-gender" value={editedProfile.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white">
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="edit-height" className="text-sm font-medium text-gray-700 mb-1 block">Tinggi (cm)</label>
                        <input id="edit-height" type="number" value={editedProfile.height} onChange={(e) => handleChange('height', parseInt(e.target.value) || 0)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                      </div>
                      <div>
                        <label htmlFor="edit-weight" className="text-sm font-medium text-gray-700 mb-1 block">Berat (kg)</label>
                        <input id="edit-weight" type="number" value={editedProfile.weight} onChange={(e) => handleChange('weight', parseInt(e.target.value) || 0)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Alamat Kelurahan</p>
                      {editedProfile.role === 'admin' ? (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <label htmlFor="edit-admin-kelurahan" className="text-sm font-medium text-blue-700 mb-2 block">Alamat Kelurahan (Admin)</label>
                          <input id="edit-admin-kelurahan" type="text" value={editedProfile.adminKelurahan || ''} onChange={(e) => handleChange('adminKelurahan', e.target.value)} className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Isi alamat kelurahan" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="edit-rt" className="text-sm text-gray-600 mb-1 block">RT</label>
                            <select id="edit-rt" value={editedProfile.rt || ''} onChange={(e) => handleChange('rt', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white">
                              <option value="">Pilih RT</option>
                              {Array.from({ length: 20 }, (_, i) => {
                                const value = String(i + 1).padStart(3, '0')
                                return <option key={value} value={value}>{value}</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-rw" className="text-sm text-gray-600 mb-1 block">RW</label>
                            <input id="edit-rw" type="text" value={editedProfile.rw} onChange={(e) => handleChange('rw', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="01" />
                          </div>
                          <div>
                            <label htmlFor="edit-kelurahan" className="text-sm text-gray-600 mb-1 block">Kelurahan</label>
                            <input id="edit-kelurahan" type="text" value={editedProfile.kelurahan} onChange={(e) => handleChange('kelurahan', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Nama Kelurahan" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" className="flex-1" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-2" /> Batal
                      </Button>
                      <Button 
                        className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" 
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <><span className="animate-spin mr-2">⏳</span> Menyimpan...</>
                        ) : (
                          <><Save className="w-4 h-4 mr-2" /> Simpan</>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-teal-100 p-3 rounded-full"><User className="w-6 h-6 text-teal-600" /></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Nama</p>
                        <p className="font-semibold text-gray-900">{profile.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 p-3 rounded-full"><Mail className="w-6 h-6 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold text-gray-900 break-all">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-green-100 p-3 rounded-full"><Phone className="w-6 h-6 text-green-600" /></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Telepon</p>
                        <p className="font-semibold text-gray-900">{profile.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-purple-100 p-3 rounded-full"><Calendar className="w-6 h-6 text-purple-600" /></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Lahir</p>
                        <p className="font-semibold text-gray-900">{new Date(profile.birthDate).toLocaleDateString('id-ID')} ({calculateAge(profile.birthDate)} th)</p>
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      {profile.role === 'admin' ? (
                        <>
                          <p className="text-sm text-gray-500 mb-2">Alamat Kelurahan</p>
                          <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                            <div className="bg-blue-100 p-3 rounded-full"><span className="text-blue-600 text-xs font-bold">ADMIN</span></div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{profile.adminKelurahan || 'Belum diisi'}</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500 mb-2">Alamat Kelurahan</p>
                          <div className="flex items-center space-x-4 p-4 bg-teal-50 rounded-lg">
                            <div className="bg-teal-100 p-3 rounded-full"><span className="text-teal-600 text-xs font-bold">RT/RW</span></div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">RT {profile.rt} / RW {profile.rw}</p>
                              <p className="text-sm text-gray-600">{profile.kelurahan}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* QR Code Card - Akses Cepat */}
            <Card className="border-2 border-dashed border-teal-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="w-5 h-5 text-teal-600" />
                  Akses Cepat
                </CardTitle>
                <CardDescription>Scan untuk login otomatis tanpa password</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-3">
                    <QRCodeSVG 
                      value={`${appUrl}/login-qr?userId=${profile.uid}&email=${encodeURIComponent(profile.email)}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mb-3">
                    Scan QR code ini dengan kamera HP untuk login otomatis ke InterPulse
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-teal-600 border-teal-200 hover:bg-teal-50"
                    onClick={() => {
                      const loginUrl = `${appUrl}/login-qr?userId=${profile.uid}&email=${encodeURIComponent(profile.email)}`
                      navigator.clipboard.writeText(loginUrl)
                      alert('Link login telah disalin ke clipboard!')
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Salin Link Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Health Data Modal */}
      {showHealthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingHealth ? 'Edit Data' : 'Tambah Data'}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="health-type" className="text-sm font-medium text-gray-700 mb-1 block">Tipe</label>
                <input id="health-type" type="text" value={healthForm.type} onChange={(e) => setHealthForm({...healthForm, type: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Contoh: Berat Badan" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="health-value" className="text-sm font-medium text-gray-700 mb-1 block">Nilai</label>
                  <input id="health-value" type="number" value={healthForm.value} onChange={(e) => setHealthForm({...healthForm, value: parseFloat(e.target.value) || 0})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label htmlFor="health-unit" className="text-sm font-medium text-gray-700 mb-1 block">Satuan</label>
                  <input id="health-unit" type="text" value={healthForm.unit} onChange={(e) => setHealthForm({...healthForm, unit: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="kg, cm, dll" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowHealthModal(false)}>Batal</Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveHealth}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievement Modal */}
      {showAchievementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingAchievement ? 'Edit Pencapaian' : 'Tambah Pencapaian'}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="ach-title" className="text-sm font-medium text-gray-700 mb-1 block">Judul</label>
                <input id="ach-title" type="text" value={achievementForm.title} onChange={(e) => setAchievementForm({...achievementForm, title: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label htmlFor="ach-desc" className="text-sm font-medium text-gray-700 mb-1 block">Deskripsi</label>
                <input id="ach-desc" type="text" value={achievementForm.description} onChange={(e) => setAchievementForm({...achievementForm, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label htmlFor="ach-icon" className="text-sm font-medium text-gray-700 mb-1 block">Icon (Emoji)</label>
                <input id="ach-icon" type="text" value={achievementForm.icon} onChange={(e) => setAchievementForm({...achievementForm, icon: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ach-target" className="text-sm font-medium text-gray-700 mb-1 block">Target</label>
                  <input id="ach-target" type="number" value={achievementForm.target} onChange={(e) => setAchievementForm({...achievementForm, target: parseInt(e.target.value) || 0})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label htmlFor="ach-progress" className="text-sm font-medium text-gray-700 mb-1 block">Progress</label>
                  <input id="ach-progress" type="number" value={achievementForm.current} onChange={(e) => setAchievementForm({...achievementForm, current: parseInt(e.target.value) || 0})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowAchievementModal(false)}>Batal</Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveAchievement}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editingTarget ? 'Edit Target' : 'Tambah Target'}</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="target-title" className="text-sm font-medium text-gray-700 mb-1 block">Judul</label>
                <input id="target-title" type="text" value={targetForm.title} onChange={(e) => setTargetForm({...targetForm, title: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label htmlFor="target-desc" className="text-sm font-medium text-gray-700 mb-1 block">Deskripsi</label>
                <input id="target-desc" type="text" value={targetForm.description} onChange={(e) => setTargetForm({...targetForm, description: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="target-value" className="text-sm font-medium text-gray-700 mb-1 block">Target Nilai</label>
                  <input id="target-value" type="number" value={targetForm.targetValue} onChange={(e) => setTargetForm({...targetForm, targetValue: parseFloat(e.target.value) || 0})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label htmlFor="target-current" className="text-sm font-medium text-gray-700 mb-1 block">Saat Ini</label>
                  <input id="target-current" type="number" value={targetForm.currentValue} onChange={(e) => setTargetForm({...targetForm, currentValue: parseFloat(e.target.value) || 0})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label htmlFor="target-unit" className="text-sm font-medium text-gray-700 mb-1 block">Satuan</label>
                <input id="target-unit" type="text" value={targetForm.unit} onChange={(e) => setTargetForm({...targetForm, unit: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="kg, langkah, jam, dll" />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowTargetModal(false)}>Batal</Button>
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveTarget}>Simpan</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
