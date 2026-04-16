'use client'

import { useGlobalAudio, availableTracks } from '@/contexts/GlobalAudioContext'
import { Play, Pause, Volume2, VolumeX, Music, X, SkipForward } from 'lucide-react'
import { useState } from 'react'

export default function MiniPlayer() {
  const { 
    isPlaying, 
    currentTrack, 
    volume, 
    isMuted,
    playTrack, 
    pauseTrack, 
    resumeTrack, 
    stopTrack,
    setVolume,
    toggleMute
  } = useGlobalAudio()
  
  const [isExpanded, setIsExpanded] = useState(false)

  if (!currentTrack) return null

  const currentTrackIndex = availableTracks.findIndex(t => t.id === currentTrack.id)
  const nextTrack = availableTracks[(currentTrackIndex + 1) % availableTracks.length]

  const handleNext = () => {
    playTrack(nextTrack)
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack()
    } else {
      resumeTrack()
    }
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-out ${
      isExpanded ? 'bottom-24 left-4 right-4' : 'bottom-24 right-4'
    }`}>
      <div className={`bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-300 ${
        isExpanded ? 'p-4' : 'p-3'
      }`}>
        {/* Compact View */}
        {!isExpanded && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(true)}
              title="Buka pemutar musik"
              aria-label="Buka pemutar musik"
              className={`w-12 h-12 rounded-xl bg-gradient-to-r ${currentTrack.color} flex items-center justify-center text-white shadow-lg`}
            >
              <Music className="w-6 h-6" />
            </button>
            
            <div className="hidden sm:block mr-2">
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{currentTrack.name}</p>
              <p className="text-xs text-gray-500">{isPlaying ? 'Playing' : 'Paused'}</p>
            </div>
            
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              aria-label={isPlaying ? 'Pause music' : 'Play music'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${currentTrack.color} flex items-center justify-center text-white shadow-lg`}>
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{currentTrack.name}</p>
                  <p className="text-sm text-gray-500">{currentTrack.description}</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                title="Tutup"
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause music' : 'Play music'}
                className={`w-14 h-14 rounded-full bg-gradient-to-r ${currentTrack.color} flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all active:scale-95`}
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
              </button>
              
              <button
                onClick={handleNext}
                title="Lanjut"
                aria-label="Lanjut ke track berikutnya"
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button
                onClick={stopTrack}
                title="Berhenti"
                aria-label="Berhenti memutar musik"
                className="w-12 h-12 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
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
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                aria-label="Volume"
              />
              <span className="text-sm text-gray-500 w-10 text-right">{Math.round(volume * 100)}%</span>
            </div>

            {/* Track List */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Pilih Track Lain:</p>
              <div className="grid grid-cols-2 gap-2">
                {availableTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`p-2 rounded-lg text-left transition-colors ${
                      currentTrack.id === track.id
                        ? 'bg-gradient-to-r ' + track.color + ' text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <p className="text-sm font-medium">{track.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
