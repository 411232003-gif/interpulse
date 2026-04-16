'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Minus, 
  Utensils, 
  Flame, 
  Target, 
  ChevronLeft,
  Camera,
  Clock,
  Calendar,
  TrendingUp,
  Apple,
  Coffee,
  Moon,
  Sun,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BackButton from '@/components/BackButton'

// Types
interface FoodItem {
  id: string
  name: string
  calories: number
  portion: string
  time: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: string
}

interface CustomFood {
  id: string
  name: string
  calories: number
  portion: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all'
}

interface DailyGoal {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface UserProfile {
  weight: number
  height: number
  age: number
  gender: 'male' | 'female'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal: 'lose' | 'maintain' | 'gain'
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
}

const GOAL_ADJUSTMENTS = {
  lose: -500,
  maintain: 0,
  gain: 500
}

export default function KaloriTracker() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  // User Profile State
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain'
  })
  
  // Food Items State
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null)
  
  // Custom Food Library State
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([])
  const [showFoodLibrary, setShowFoodLibrary] = useState(false)
  const [editingCustomFood, setEditingCustomFood] = useState<CustomFood | null>(null)
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    calories: '',
    portion: '1 serving',
    category: 'all' as CustomFood['category']
  })
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    calories: '',
    portion: '1 serving',
    category: 'breakfast' as FoodItem['category'],
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  })

  // Load data from localStorage
  useEffect(() => {
    setMounted(true)
    const savedFoods = localStorage.getItem('kaloriFoods')
    const savedProfile = localStorage.getItem('kaloriProfile')
    const savedCustomFoods = localStorage.getItem('kaloriCustomFoods')
    
    if (savedFoods) {
      setFoodItems(JSON.parse(savedFoods))
    }
    
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile))
    }
    
    if (savedCustomFoods) {
      setCustomFoods(JSON.parse(savedCustomFoods))
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('kaloriFoods', JSON.stringify(foodItems))
    }
  }, [foodItems, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('kaloriProfile', JSON.stringify(profile))
    }
  }, [profile, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('kaloriCustomFoods', JSON.stringify(customFoods))
    }
  }, [customFoods, mounted])

  // Calculate daily goal based on profile
  const calculateDailyGoal = useMemo(() => {
    // Mifflin-St Jeor Equation
    let bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age
    bmr += profile.gender === 'male' ? 5 : -161
    
    const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]
    const targetCalories = tdee + GOAL_ADJUSTMENTS[profile.goal]
    
    return {
      calories: Math.round(targetCalories),
      protein: Math.round(profile.weight * 1.6), // 1.6g per kg bodyweight
      carbs: Math.round((targetCalories * 0.5) / 4), // 50% of calories from carbs
      fat: Math.round((targetCalories * 0.25) / 9) // 25% of calories from fat
    }
  }, [profile])

  // Filter foods for selected date
  const todaysFoods = useMemo(() => {
    return foodItems.filter(item => item.date === selectedDate)
  }, [foodItems, selectedDate])

  // Calculate totals
  const totals = useMemo(() => {
    return todaysFoods.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      count: acc.count + 1
    }), { calories: 0, count: 0 })
  }, [todaysFoods])

  // Calculate by category
  const categoryTotals = useMemo(() => {
    const categories: FoodItem['category'][] = ['breakfast', 'lunch', 'dinner', 'snack']
    return categories.map(cat => ({
      category: cat,
      calories: todaysFoods.filter(item => item.category === cat).reduce((sum, item) => sum + item.calories, 0),
      count: todaysFoods.filter(item => item.category === cat).length
    }))
  }, [todaysFoods])

  // Progress percentage
  const progressPercentage = Math.min((totals.calories / calculateDailyGoal.calories) * 100, 100)
  const remainingCalories = calculateDailyGoal.calories - totals.calories

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.calories) return

    const newItem: FoodItem = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.name,
      calories: parseInt(formData.calories),
      portion: formData.portion,
      time: formData.time,
      category: formData.category,
      date: selectedDate
    }

    if (editingItem) {
      setFoodItems(prev => prev.map(item => item.id === editingItem.id ? newItem : item))
      setEditingItem(null)
    } else {
      setFoodItems(prev => [...prev, newItem])
    }

    setShowAddModal(false)
    setFormData({
      name: '',
      calories: '',
      portion: '1 serving',
      category: 'breakfast',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    })
  }

  // Handle delete
  const handleDelete = (id: string) => {
    setFoodItems(prev => prev.filter(item => item.id !== id))
  }

  // Handle edit
  const handleEdit = (item: FoodItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      calories: item.calories.toString(),
      portion: item.portion,
      category: item.category,
      time: item.time
    })
    setShowAddModal(true)
  }

  // ===== CUSTOM FOOD LIBRARY CRUD =====
  
  // Add/Update custom food
  const handleSaveCustomFood = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFoodForm.name || !customFoodForm.calories) return

    const newFood: CustomFood = {
      id: editingCustomFood?.id || Date.now().toString(),
      name: customFoodForm.name,
      calories: parseInt(customFoodForm.calories),
      portion: customFoodForm.portion,
      category: customFoodForm.category
    }

    if (editingCustomFood) {
      setCustomFoods(prev => prev.map(f => f.id === editingCustomFood.id ? newFood : f))
      setEditingCustomFood(null)
    } else {
      setCustomFoods(prev => [...prev, newFood])
    }

    setCustomFoodForm({ name: '', calories: '', portion: '1 serving', category: 'all' })
  }

  // Delete custom food
  const handleDeleteCustomFood = (id: string) => {
    setCustomFoods(prev => prev.filter(f => f.id !== id))
  }

  // Edit custom food
  const handleEditCustomFood = (food: CustomFood) => {
    setEditingCustomFood(food)
    setCustomFoodForm({
      name: food.name,
      calories: food.calories.toString(),
      portion: food.portion,
      category: food.category
    })
  }

  // Add from library to today's log
  const addFromLibrary = (food: CustomFood) => {
    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: food.name,
      calories: food.calories,
      portion: food.portion,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      category: food.category === 'all' ? formData.category : food.category as FoodItem['category'],
      date: selectedDate
    }
    setFoodItems(prev => [...prev, newItem])
  }

  // Quick add common foods
  const quickAddFoods = [
    { name: 'Nasi Putih (1 piring)', calories: 200, portion: '1 piring' },
    { name: 'Ayam Goreng (1 potong)', calories: 250, portion: '1 potong' },
    { name: 'Telur Goreng', calories: 90, portion: '1 butir' },
    { name: 'Sayur Bayam', calories: 50, portion: '1 piring' },
    { name: 'Tempe Goreng', calories: 150, portion: '2 potong' },
    { name: 'Tahu Goreng', calories: 120, portion: '2 potong' },
    { name: 'Sate Ayam (5 tusuk)', calories: 300, portion: '5 tusuk' },
    { name: 'Bubur Ayam', calories: 350, portion: '1 mangkuk' },
    { name: 'Nasi Goreng', calories: 450, portion: '1 piring' },
    { name: 'Gado-gado', calories: 400, portion: '1 piring' },
    { name: 'Roti Bakar', calories: 180, portion: '2 iris' },
    { name: 'Susu Full Cream', calories: 150, portion: '1 gelas' },
    { name: 'Kopi Susu', calories: 80, portion: '1 cangkir' },
    { name: 'Teh Manis', calories: 70, portion: '1 gelas' },
    { name: 'Pisang', calories: 100, portion: '1 buah' },
    { name: 'Apel', calories: 80, portion: '1 buah' }
  ]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'breakfast': return <Sun className="w-4 h-4" />
      case 'lunch': return <Utensils className="w-4 h-4" />
      case 'dinner': return <Moon className="w-4 h-4" />
      case 'snack': return <Coffee className="w-4 h-4" />
      default: return <Utensils className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'breakfast': return 'Sarapan'
      case 'lunch': return 'Makan Siang'
      case 'dinner': return 'Makan Malam'
      case 'snack': return 'Camilan'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'breakfast': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'lunch': return 'bg-green-100 text-green-700 border-green-200'
      case 'dinner': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'snack': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-nav">
      <BackButton />
      
      <div className="mobile-container py-4 sm:py-6">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Tracker Kalori</h1>
          <p className="text-sm sm:text-base text-gray-600">Pantau asupan kalori harian Anda</p>
        </div>

        {/* Date Selector */}
        <Card className="mb-6 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Pilih tanggal"
                aria-label="Pilih tanggal"
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  Hari Ini
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Progress Card */}
        <Card className="mb-6 shadow-lg bg-gradient-to-br from-white to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-700">Target Harian</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileModal(true)}
                className="text-orange-600 hover:bg-orange-100"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                Edit Profil
              </Button>
            </div>

            {/* Circular Progress */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-40 h-40 mb-4">
                {/* Background circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#fed7aa"
                    strokeWidth="12"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#f97316"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressPercentage / 100)}`}
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">{totals.calories}</span>
                  <span className="text-sm text-gray-500">/ {calculateDailyGoal.calories}</span>
                  <span className="text-xs text-gray-400 mt-1">kkal</span>
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                {remainingCalories > 0 ? (
                  <p className="text-green-600 font-medium">
                    Tersisa {remainingCalories} kkal untuk hari ini
                  </p>
                ) : remainingCalories === 0 ? (
                  <p className="text-orange-600 font-medium">
                    Target tercapai! 🎉
                  </p>
                ) : (
                  <p className="text-red-600 font-medium">
                    Melebihi target {-remainingCalories} kkal
                  </p>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-orange-100 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">Protein</p>
                <p className="text-lg font-bold text-orange-700">{calculateDailyGoal.protein}g</p>
                <p className="text-xs text-gray-500">target</p>
              </div>
              <div className="text-center p-3 bg-green-100 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">Karbohidrat</p>
                <p className="text-lg font-bold text-green-700">{calculateDailyGoal.carbs}g</p>
                <p className="text-xs text-gray-500">target</p>
              </div>
              <div className="text-center p-3 bg-blue-100 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">Lemak</p>
                <p className="text-lg font-bold text-blue-700">{calculateDailyGoal.fat}g</p>
                <p className="text-xs text-gray-500">target</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="mb-6 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-500" />
              Rincian per Waktu Makan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              {categoryTotals.map((cat) => (
                <div key={cat.category} className={`p-3 rounded-xl border-2 ${getCategoryColor(cat.category)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(cat.category)}
                    <span className="text-sm font-medium">{getCategoryLabel(cat.category)}</span>
                  </div>
                  <p className="text-xl font-bold">{cat.calories} <span className="text-xs font-normal">kkal</span></p>
                  <p className="text-xs opacity-75">{cat.count} item</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Food List */}
        <Card className="mb-6 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-500" />
                Daftar Makanan ({todaysFoods.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFoodLibrary(true)}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <Apple className="w-4 h-4 mr-1" />
                  Library
                </Button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Tambah
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {todaysFoods.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Apple className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-gray-500 mb-2">Belum ada makanan tercatat</p>
                <p className="text-sm text-gray-400">Tambahkan makanan pertama Anda hari ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysFoods
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category)}`}>
                            {getCategoryLabel(item.category)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.portion}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">{item.calories}</p>
                          <p className="text-xs text-gray-500">kkal</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingItem ? 'Edit Makanan' : 'Tambah Makanan'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingItem(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Quick Add Buttons */}
                {!editingItem && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Pilih Cepat:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {quickAddFoods.map((food, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            name: food.name,
                            calories: food.calories.toString(),
                            portion: food.portion
                          }))}
                          className="text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm transition-colors"
                        >
                          <p className="font-medium text-gray-800 truncate">{food.name}</p>
                          <p className="text-xs text-orange-600">{food.calories} kkal</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Nama Makanan *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Nasi Goreng"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Kalori (kkal) *
                    </label>
                    <input
                      type="number"
                      value={formData.calories}
                      onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                      placeholder="300"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Porsi
                    </label>
                    <input
                      type="text"
                      value={formData.portion}
                      onChange={(e) => setFormData(prev => ({ ...prev, portion: e.target.value }))}
                      placeholder="1 piring"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Kategori
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as FoodItem['category'] }))}
                      title="Pilih kategori makanan"
                      aria-label="Pilih kategori makanan"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="breakfast">Sarapan</option>
                      <option value="lunch">Makan Siang</option>
                      <option value="dinner">Makan Malam</option>
                      <option value="snack">Camilan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Waktu
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                      title="Pilih waktu makan"
                      aria-label="Pilih waktu makan"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingItem(null)
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {editingItem ? 'Simpan' : 'Tambah'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Profil & Target</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Berat (kg)</label>
                    <input
                      type="number"
                      value={profile.weight}
                      onChange={(e) => setProfile(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                      title="Berat badan dalam kg"
                      aria-label="Berat badan dalam kg"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Tinggi (cm)</label>
                    <input
                      type="number"
                      value={profile.height}
                      onChange={(e) => setProfile(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                      title="Tinggi badan dalam cm"
                      aria-label="Tinggi badan dalam cm"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Umur</label>
                    <input
                      type="number"
                      value={profile.age}
                      onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                      title="Umur dalam tahun"
                      aria-label="Umur dalam tahun"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Gender</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                      title="Pilih gender"
                      aria-label="Pilih gender"
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="male">Pria</option>
                      <option value="female">Wanita</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Level Aktivitas</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => setProfile(prev => ({ ...prev, activityLevel: e.target.value as UserProfile['activityLevel'] }))}
                    title="Pilih level aktivitas"
                    aria-label="Pilih level aktivitas"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="sedentary">Sedentari (tidak olahraga)</option>
                    <option value="light">Ringan (olahraga 1-3x/minggu)</option>
                    <option value="moderate">Sedang (olahraga 3-5x/minggu)</option>
                    <option value="active">Aktif (olahraga 6-7x/minggu)</option>
                    <option value="very_active">Sangat Aktif (olahraga 2x/hari)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tujuan</label>
                  <select
                    value={profile.goal}
                    onChange={(e) => setProfile(prev => ({ ...prev, goal: e.target.value as UserProfile['goal'] }))}
                    title="Pilih tujuan diet"
                    aria-label="Pilih tujuan diet"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="lose">Turunkan Berat Badan (-500 kkal)</option>
                    <option value="maintain">Pertahankan Berat Badan</option>
                    <option value="gain">Naikkan Berat Badan (+500 kkal)</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Target Kalori Harian:</p>
                  <p className="text-2xl font-bold text-orange-600">{calculateDailyGoal.calories} kkal</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Dihitung dengan rumus Mifflin-St Jeor
                  </p>
                </div>

                <Button
                  onClick={() => setShowProfileModal(false)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Simpan Profil
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Food Library Modal */}
      {showFoodLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Library Makanan</h2>
                <button
                  onClick={() => {
                    setShowFoodLibrary(false)
                    setEditingCustomFood(null)
                    setCustomFoodForm({ name: '', calories: '', portion: '1 serving', category: 'all' })
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Add/Edit Custom Food Form */}
              <form onSubmit={handleSaveCustomFood} className="mb-6 p-4 bg-orange-50 rounded-xl">
                <h3 className="font-medium text-gray-800 mb-3">
                  {editingCustomFood ? 'Edit Makanan' : 'Tambah Makanan ke Library'}
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Nama makanan"
                    value={customFoodForm.name}
                    onChange={(e) => setCustomFoodForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Kalori"
                      value={customFoodForm.calories}
                      onChange={(e) => setCustomFoodForm(prev => ({ ...prev, calories: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Porsi (e.g. 1 piring)"
                      value={customFoodForm.portion}
                      onChange={(e) => setCustomFoodForm(prev => ({ ...prev, portion: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <select
                    value={customFoodForm.category}
                    onChange={(e) => setCustomFoodForm(prev => ({ ...prev, category: e.target.value as CustomFood['category'] }))}
                    title="Pilih kategori makanan"
                    aria-label="Pilih kategori makanan"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="breakfast">Sarapan</option>
                    <option value="lunch">Makan Siang</option>
                    <option value="dinner">Makan Malam</option>
                    <option value="snack">Camilan</option>
                  </select>
                  <div className="flex gap-2">
                    {editingCustomFood && (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingCustomFood(null)
                          setCustomFoodForm({ name: '', calories: '', portion: '1 serving', category: 'all' })
                        }}
                      >
                        Batal
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {editingCustomFood ? 'Simpan' : 'Tambah ke Library'}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Custom Foods List */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">
                  Makanan Saya ({customFoods.length})
                </h3>
                {customFoods.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Belum ada makanan di library. Tambahkan makanan favorit Anda!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customFoods.map((food) => (
                      <div
                        key={food.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{food.name}</p>
                          <p className="text-sm text-orange-600">{food.calories} kkal • {food.portion}</p>
                          {food.category !== 'all' && (
                            <span className="text-xs text-gray-500">{getCategoryLabel(food.category)}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => addFromLibrary(food)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Tambah ke hari ini"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCustomFood(food)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCustomFood(food.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
