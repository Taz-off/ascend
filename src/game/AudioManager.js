const LEVEL_MUSIC = [
  '/audio/music/level-01-awakening.mp3',
  '/audio/music/level-02-skygrove.mp3',
  '/audio/music/level-03-crystal-depths.mp3',
  '/audio/music/level-04-windswept-heights.mp3',
  '/audio/music/level-05-celestial-sanctum.mp3',
  '/audio/music/level-06-ancient-paths.mp3',
  '/audio/music/level-07-forgotten-guardians.mp3',
  '/audio/music/level-08-stormreach.mp3',
  '/audio/music/level-09-ascension.mp3',
  '/audio/music/level-10-zenith.mp3',
]

const SYNTH_MUSIC = {
  menu: {
    bpm: 86,
    lead: [329.63, 392.0, 493.88, 440.0, 392.0, 329.63],
    bass: [164.81, 196.0, 246.94, 220.0],
    wave: 'triangle',
    mood: 0.22,
  },
  boss: {
    bpm: 132,
    lead: [196.0, 220.0, 233.08, 196.0, 261.63, 233.08],
    bass: [98.0, 98.0, 116.54, 130.81],
    wave: 'sawtooth',
    mood: 0.34,
  },
  victory: {
    bpm: 96,
    lead: [392.0, 493.88, 587.33, 783.99, 659.25, 587.33],
    bass: [196.0, 246.94, 293.66, 392.0],
    wave: 'triangle',
    mood: 0.28,
  },
  gameOver: {
    bpm: 72,
    lead: [293.66, 261.63, 220.0, 196.0, 174.61],
    bass: [146.83, 130.81, 110.0, 98.0],
    wave: 'sine',
    mood: 0.24,
  },
}

const DEFAULT_AUDIO_SETTINGS = {
  masterVolume: 0.85,
  musicVolume: 0.72,
  sfxVolume: 0.86,
}

export function defaultAudioSettings() {
  return { ...DEFAULT_AUDIO_SETTINGS }
}

export class AudioManager {
  constructor(settings = defaultAudioSettings()) {
    this.settings = { ...DEFAULT_AUDIO_SETTINGS, ...settings }
    this.context = null
    this.masterGain = null
    this.musicGain = null
    this.sfxGain = null
    this.currentAudio = null
    this.currentTrackKey = null
    this.synthTimer = null
    this.synthStep = 0
    this.synthStyle = null
    this.pendingTrack = null
    this.unlocked = false

    this.handleFirstGesture = () => this.unlock()
    this.handleButtonClick = (event) => {
      if (event.target.closest('button')) {
        this.playSfx('ui')
      }
    }

    window.addEventListener('pointerdown', this.handleFirstGesture, { passive: true })
    window.addEventListener('keydown', this.handleFirstGesture)
    window.addEventListener('click', this.handleButtonClick)
  }

  destroy() {
    window.removeEventListener('pointerdown', this.handleFirstGesture)
    window.removeEventListener('keydown', this.handleFirstGesture)
    window.removeEventListener('click', this.handleButtonClick)
    this.stopMusic()
    if (this.context) {
      this.context.close()
    }
  }

  unlock() {
    this.ensureContext()
    if (this.context?.state === 'suspended') {
      this.context.resume()
    }
    this.unlocked = true

    if (this.pendingTrack) {
      const track = this.pendingTrack
      this.pendingTrack = null
      this.playTrack(track)
    }
  }

  setSettings(settings) {
    this.settings = { ...DEFAULT_AUDIO_SETTINGS, ...settings }
    this.applyVolumes()
  }

  playMenu() {
    this.playTrack({ key: 'menu', synth: 'menu' })
  }

  playLevel(index) {
    this.playTrack({ key: `level-${index + 1}`, src: LEVEL_MUSIC[index % LEVEL_MUSIC.length] })
  }

  playBoss() {
    this.playTrack({ key: 'boss', synth: 'boss' })
  }

  playVictory() {
    this.playTrack({ key: 'victory', synth: 'victory' })
    this.playSfx('victory')
  }

  playGameOver() {
    this.playTrack({ key: 'gameOver', synth: 'gameOver' })
  }

  stopMusic() {
    this.stopSynth()
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    this.currentTrackKey = null
  }

  playTrack(track) {
    if (this.currentTrackKey === track.key && (this.currentAudio || this.synthStyle)) return

    this.pendingTrack = track
    if (!this.unlocked) {
      return
    }

    this.stopMusic()
    this.currentTrackKey = track.key
    this.pendingTrack = null

    if (track.src) {
      this.currentAudio = new Audio(track.src)
      this.currentAudio.loop = true
      this.currentAudio.preload = 'auto'
      this.currentAudio.volume = this.musicOutputVolume()
      this.currentAudio.play().catch(() => {
        this.currentAudio = null
        this.currentTrackKey = null
        this.pendingTrack = track
      })
      return
    }

    this.startSynth(track.synth)
  }

  playSfx(name) {
    this.ensureContext()
    if (!this.context) return

    const now = this.context.currentTime
    const volume = 1
    if (this.sfxOutputVolume() <= 0.001) return

    const sfx = {
      jump: () => this.playSweep(now, 240, 520, 0.16, volume * 0.34, 'triangle'),
      doubleJump: () => this.playSweep(now, 320, 720, 0.18, volume * 0.36, 'triangle'),
      dash: () => this.playNoise(now, 0.16, volume * 0.28, 900),
      sword: () => this.playSweep(now, 720, 210, 0.11, volume * 0.28, 'sawtooth'),
      parry: () => this.playChord(now, [440, 660, 880], 0.14, volume * 0.22, 'triangle'),
      block: () => this.playChord(now, [520, 780, 1040], 0.2, volume * 0.3, 'square'),
      enemyHit: () => this.playSweep(now, 280, 140, 0.13, volume * 0.34, 'sawtooth'),
      playerHit: () => this.playSweep(now, 180, 90, 0.22, volume * 0.38, 'sawtooth'),
      playerDeath: () => this.playSweep(now, 220, 55, 0.65, volume * 0.44, 'sawtooth'),
      enemyDeath: () => this.playBurst(now, volume * 0.42),
      checkpoint: () => this.playChord(now, [392, 493.88, 659.25], 0.32, volume * 0.32, 'triangle'),
      ui: () => this.playTone(now, 520, 0.055, volume * 0.14, 'triangle'),
      bossAttack: () => this.playSweep(now, 110, 360, 0.28, volume * 0.42, 'sawtooth'),
      victory: () => this.playChord(now, [392, 493.88, 587.33, 783.99], 0.62, volume * 0.34, 'triangle'),
    }

    sfx[name]?.()
  }

  ensureContext() {
    if (this.context) return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    this.context = new AudioContextClass()
    this.masterGain = this.context.createGain()
    this.musicGain = this.context.createGain()
    this.sfxGain = this.context.createGain()
    this.musicGain.connect(this.masterGain)
    this.sfxGain.connect(this.masterGain)
    this.masterGain.connect(this.context.destination)
    this.applyVolumes()
  }

  applyVolumes() {
    if (this.currentAudio) {
      this.currentAudio.volume = this.musicOutputVolume()
    }
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume
      this.musicGain.gain.value = this.settings.musicVolume
      this.sfxGain.gain.value = this.settings.sfxVolume
    }
  }

  musicOutputVolume() {
    return this.settings.masterVolume * this.settings.musicVolume
  }

  sfxOutputVolume() {
    return this.settings.masterVolume * this.settings.sfxVolume
  }

  startSynth(name) {
    this.ensureContext()
    if (!this.context) return

    this.stopSynth()
    this.synthStyle = SYNTH_MUSIC[name] || SYNTH_MUSIC.menu
    this.synthStep = 0
    this.scheduleSynthBar()
    this.synthTimer = window.setInterval(() => this.scheduleSynthBar(), 1000)
  }

  stopSynth() {
    if (this.synthTimer) {
      window.clearInterval(this.synthTimer)
      this.synthTimer = null
    }
    this.synthStyle = null
  }

  scheduleSynthBar() {
    if (!this.context || !this.synthStyle) return
    const beat = 60 / this.synthStyle.bpm
    const now = this.context.currentTime + 0.05

    for (let index = 0; index < 4; index += 1) {
      const step = this.synthStep + index
      const start = now + index * beat
      const lead = this.synthStyle.lead[step % this.synthStyle.lead.length]
      const bass = this.synthStyle.bass[Math.floor(step / 2) % this.synthStyle.bass.length]

      this.playTone(start, lead, beat * 0.76, this.synthStyle.mood, this.synthStyle.wave, this.musicGain)
      if (index % 2 === 0) {
        this.playTone(start, bass, beat * 1.8, this.synthStyle.mood * 0.55, 'sine', this.musicGain)
      }
    }
    this.synthStep += 4
  }

  playTone(start, frequency, duration, volume, wave = 'sine', destination = this.sfxGain) {
    if (!this.context || !destination) return

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  playSweep(start, from, to, duration, volume, wave = 'sine') {
    if (!this.context || !this.sfxGain) return

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(from, start)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(this.sfxGain)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.03)
  }

  playChord(start, frequencies, duration, volume, wave = 'triangle') {
    frequencies.forEach((frequency, index) => {
      this.playTone(start + index * 0.018, frequency, duration, volume, wave)
    })
  }

  playNoise(start, duration, volume, filterFrequency = 700) {
    if (!this.context || !this.sfxGain) return

    const sampleCount = Math.floor(this.context.sampleRate * duration)
    const buffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = Math.random() * 2 - 1
    }

    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = filterFrequency
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain)
    source.start(start)
  }

  playBurst(start, volume) {
    this.playNoise(start, 0.2, volume * 0.45, 520)
    this.playSweep(start, 320, 80, 0.28, volume * 0.35, 'sawtooth')
  }
}
