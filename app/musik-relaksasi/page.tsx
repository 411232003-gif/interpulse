'use client'

import { useGlobalAudio, availableTracks } from '@/contexts/GlobalAudioContext'
import BackButton from '@/components/BackButton'
import { Music, Play, Pause, Volume2, VolumeX, Headphones } from 'lucide-react'
import { useState } from 'react'

export default function MusikRelaksasi() {
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    isMuted,
    playTrack, 
    pauseTrack, 
    resumeTrack,
    setVolume,
    toggleMute
  } = useGlobalAudio()
  
  const [selectedDuration, setSelectedDuration] = useState(0)

  const handleTrackClick = (track: typeof availableTracks[0]) => {
    if (currentTrack?.id === track.id && isPlaying) {
      pauseTrack()
    } else {
      playTrack(track)
    }
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack()
    } else if (currentTrack) {
      resumeTrack()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-nav">
      <BackButton />
      
      <div className="mobile-container py-4 sm:py-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 px-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-3 shadow-lg">
            <Music className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Musik Relaksasi</h1>
          <p className="text-sm sm:text-base text-gray-600">Suara alami untuk menenangkan pikiran</p>
        </div>

        {/* Now Playing Card */}
        {currentTrack && (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 border-2 border-purple-100">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-r ${currentTrack.color} shadow-lg`}>
                <Headphones className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg sm:text-xl text-gray-800">{currentTrack.name}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{currentTrack.description}</p>
              </div>
              <button
                onClick={handlePlayPause}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all bg-gradient-to-r ${currentTrack.color} text-white`}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleMute} 
                className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                aria-label="Volume"
              />
              <span className="text-sm text-gray-500 w-12 text-right">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* Duration Timer */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">⏱️ Timer</h3>
          <div className="grid grid-cols-4 gap-2">
            {[0, 10, 20, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                onClick={() => setSelectedDuration(mins)}
                className={`py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  selectedDuration === mins
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mins === 0 ? '∞' : `${mins}m`}
              </button>
            ))}
          </div>
          {selectedDuration > 0 && (
            <p className="text-xs text-purple-600 mt-2">Musik akan berhenti otomatis setelah {selectedDuration} menit</p>
          )}
        </div>

        {/* Track List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 px-1">Pilih Suara</h3>
          {availableTracks.map((track) => (
            <button
              key={track.id}
              onClick={() => handleTrackClick(track)}
              className={`w-full bg-white rounded-2xl p-4 shadow-md border-2 transition-all active:scale-[0.98] text-left ${
                currentTrack?.id === track.id
                  ? 'border-purple-500 shadow-lg'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r ${track.color} text-white`}>
                  {isPlaying && currentTrack?.id === track.id ? (
                    <div className="flex gap-0.5">
                      <span className="w-1 h-4 bg-white rounded-full animate-pulse" />
                      <span className="w-1 h-6 bg-white rounded-full animate-pulse delay-100" />
                      <span className="w-1 h-3 bg-white rounded-full animate-pulse delay-200" />
                    </div>
                  ) : (
                    <Music className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{track.name}</h4>
                  <p className="text-xs sm:text-sm text-gray-500">{track.description}</p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  currentTrack?.id === track.id && isPlaying
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {currentTrack?.id === track.id && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-6 bg-gradient-to-r from-purple-100 to-violet-100 rounded-2xl p-4">
          <h4 className="font-semibold text-purple-800 mb-2">💡 Tips Relaksasi</h4>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Gunakan earphone untuk pengalaman lebih baik</li>
            <li>• Musik akan terus menyala meski pindah halaman</li>
            <li>• Tutup mata dan fokus pada pernapasan</li>
            <li>• Minimal 5-10 menit untuk efek optimal</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
