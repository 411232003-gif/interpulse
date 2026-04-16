'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

interface Track {
  id: string
  name: string
  description: string
  color: string
}

interface AudioState {
  isPlaying: boolean
  currentTrack: Track | null
  volume: number
  isMuted: boolean
}

interface AudioContextType extends AudioState {
  playTrack: (track: Track) => void
  pauseTrack: () => void
  resumeTrack: () => void
  stopTrack: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

const GlobalAudioContext = createContext<AudioContextType | undefined>(undefined)

// Modern ambient sound generators using Web Audio API
const createAmbientSound = (trackId: string, audioContext: AudioContext): { gainNode: GainNode; cleanup: () => void } => {
  const masterGain = audioContext.createGain()
  masterGain.connect(audioContext.destination)
  masterGain.gain.value = 0.3

  const oscillators: OscillatorNode[] = []
  const gainNodes: GainNode[] = []
  const filters: (BiquadFilterNode | StereoPannerNode)[] = []

  switch (trackId) {
    case 'wind': {
      // Pink noise simulation for wind
      const bufferSize = 4096
      const noise = audioContext.createScriptProcessor(bufferSize, 1, 1)
      
      noise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          output[i] = (lastOut + (0.02 * white)) / 1.02
          lastOut = output[i]
          output[i] *= 3.5
        }
      }
      
      let lastOut = 0
      
      const filter = audioContext.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 400
      
      // Modulate filter for wind gusts
      const lfo = audioContext.createOscillator()
      const lfoGain = audioContext.createGain()
      lfo.frequency.value = 0.15
      lfoGain.gain.value = 200
      lfo.connect(lfoGain)
      lfoGain.connect(filter.frequency)
      lfo.start()
      
      const gain = audioContext.createGain()
      gain.gain.value = 0.2
      
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      
      oscillators.push(lfo)
      gainNodes.push(gain, lfoGain)
      filters.push(filter)
      
      // Store noise for cleanup
      ;(masterGain as any).noiseNode = noise
      break
    }
    
    case 'meditation': {
      // Binaural beats simulation
      const leftOsc = audioContext.createOscillator()
      const rightOsc = audioContext.createOscillator()
      const leftGain = audioContext.createGain()
      const rightGain = audioContext.createGain()
      const merger = audioContext.createChannelMerger(2)
      
      // 432Hz base with 4Hz difference for theta waves
      leftOsc.frequency.value = 432
      rightOsc.frequency.value = 436
      leftOsc.type = 'sine'
      rightOsc.type = 'sine'
      
      leftGain.gain.value = 0.15
      rightGain.gain.value = 0.15
      
      // Stereo panning
      const pannerLeft = audioContext.createStereoPanner()
      const pannerRight = audioContext.createStereoPanner()
      pannerLeft.pan.value = -1
      pannerRight.pan.value = 1
      
      leftOsc.connect(leftGain)
      leftGain.connect(pannerLeft)
      pannerLeft.connect(merger, 0, 0)
      
      rightOsc.connect(rightGain)
      rightGain.connect(pannerRight)
      pannerRight.connect(merger, 0, 1)
      
      merger.connect(masterGain)
      
      leftOsc.start()
      rightOsc.start()
      
      oscillators.push(leftOsc, rightOsc)
      gainNodes.push(leftGain, rightGain)
      filters.push(pannerLeft, pannerRight)
      break
    }
  }

  return {
    gainNode: masterGain,
    cleanup: () => {
      oscillators.forEach(osc => {
        try { osc.stop() } catch (e) {}
      })
      gainNodes.forEach(gain => gain.disconnect())
      filters.forEach(filter => filter.disconnect())
      const noiseNode = (masterGain as any).noiseNode
      if (noiseNode) {
        noiseNode.disconnect()
      }
    }
  }
}

export function GlobalAudioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioNodesRef = useRef<{ gainNode: GainNode; cleanup: () => void } | null>(null)

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContextClass()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  const playTrack = useCallback((track: Track) => {
    initAudioContext()
    if (!audioContextRef.current) return

    // Stop current if different track
    if (currentTrack?.id !== track.id && audioNodesRef.current) {
      audioNodesRef.current.cleanup()
      audioNodesRef.current = null
    }

    // Create new audio nodes
    audioNodesRef.current = createAmbientSound(track.id, audioContextRef.current)
    
    // Set volume
    audioNodesRef.current.gainNode.gain.value = isMuted ? 0 : volume * 0.3
    
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [currentTrack, volume, isMuted, initAudioContext])

  const pauseTrack = useCallback(() => {
    if (audioNodesRef.current) {
      audioNodesRef.current.gainNode.gain.value = 0
    }
    setIsPlaying(false)
  }, [])

  const resumeTrack = useCallback(() => {
    initAudioContext()
    if (audioNodesRef.current && currentTrack) {
      audioNodesRef.current.gainNode.gain.value = isMuted ? 0 : volume * 0.3
      setIsPlaying(true)
    } else if (currentTrack) {
      playTrack(currentTrack)
    }
  }, [currentTrack, volume, isMuted, initAudioContext, playTrack])

  const stopTrack = useCallback(() => {
    if (audioNodesRef.current) {
      audioNodesRef.current.cleanup()
      audioNodesRef.current = null
    }
    setIsPlaying(false)
    setCurrentTrack(null)
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume)
    if (audioNodesRef.current) {
      audioNodesRef.current.gainNode.gain.value = isMuted ? 0 : newVolume * 0.3
    }
  }, [isMuted])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev
      if (audioNodesRef.current) {
        audioNodesRef.current.gainNode.gain.value = newMuted ? 0 : volume * 0.3
      }
      return newMuted
    })
  }, [volume])

  // Resume audio context on user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume()
      }
    }
    window.addEventListener('click', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  return (
    <GlobalAudioContext.Provider value={{
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
    }}>
      {children}
    </GlobalAudioContext.Provider>
  )
}

export function useGlobalAudio() {
  const context = useContext(GlobalAudioContext)
  if (context === undefined) {
    throw new Error('useGlobalAudio must be used within a GlobalAudioProvider')
  }
  return context
}

export const availableTracks: Track[] = [
  {
    id: 'wind',
    name: 'Gentle Breeze',
    description: 'Angin sepoi lembut untuk relaksasi pikiran',
    color: 'from-teal-500 to-emerald-600'
  },
  {
    id: 'meditation',
    name: 'Deep Meditation',
    description: 'Frekuensi theta untuk meditasi dalam',
    color: 'from-violet-500 to-fuchsia-600'
  }
]
