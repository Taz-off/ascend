import { useEffect, useRef, useState } from 'react'
import { GameManager } from './game/GameManager.js'
import { LEVELS } from './game/levels.js'
import {
  Play,
  Map,
  RotateCcw,
  Home,
  ChevronRight,
  Trophy,
  Settings,
  Timer,
  Gamepad2,
  Volume2,
  Music,
  Zap,
} from 'lucide-react'

const STATE_LABELS = {
  menu: 'Menu',
  levelSelect: 'Selection',
  settings: 'Parametres',
  records: 'Records',
  playing: 'Jeu',
  paused: 'Pause',
  gameOver: 'Defaite',
  levelComplete: 'Niveau termine',
  speedrunLevelComplete: 'Speedrun',
  speedrunComplete: 'Speedrun fini',
  confirmQuitSpeedrun: 'Confirmation',
  victory: 'Victoire',
}

function App() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [gameState, setGameState] = useState({
    screen: 'menu',
    levelIndex: 0,
    maxUnlocked: 0,
    fragments: 0,
    settings: {
      audio: { masterVolume: 0.85, musicVolume: 0.72, sfxVolume: 0.86 },
    },
    timer: { levelTime: 0, globalTime: 0 },
    speedrun: { active: false, completed: false, lastLevelResult: null, finalResult: null },
    lastLevelResult: null,
    records: { levels: {}, global: 0 },
  })

  useEffect(() => {
    const game = new GameManager(canvasRef.current, {
      onStateChange: setGameState,
    })
    gameRef.current = game

    return () => game.destroy()
  }, [])

  const game = gameRef.current

  const play = () => game?.startLevel(gameState.maxUnlocked || 0)
  const startSpeedrun = () => game?.startSpeedrunMode()
  const openLevels = () => game?.showLevelSelect()
  const openSettings = () => game?.showSettings()
  const openRecords = () => game?.showRecords()
  const openMenu = () => game?.showMenu()
  const restart = () => game?.restartLevel()
  const resume = () => game?.resume()
  const next = () => game?.nextLevel()
  const setAudioVolume = (key, value) => game?.setAudioVolume(key, value)
  const confirmQuitSpeedrun = () => game?.confirmQuitSpeedrun()
  const cancelQuitSpeedrun = () => game?.cancelQuitSpeedrun()
  const audio = gameState.settings.audio || { masterVolume: 0.85, musicVolume: 0.72, sfxVolume: 0.86 }

  return (
    <main className="game-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width="1280"
        height="720"
        aria-label="Ascend, jeu de plateforme 2D low-poly"
      />

      <div className="screen-tag">{STATE_LABELS[gameState.screen]}</div>

      {gameState.screen === 'menu' && (
        <Overlay title="Ascend" subtitle="Platformer d'action vertical low-poly">
          <button className="primary-action" onClick={play}>
            <Play size={21} />
            Jouer
          </button>
          <button className="primary-action" onClick={startSpeedrun}>
            <Timer size={21} />
            Mode Speedrun
          </button>
          <button className="secondary-action" onClick={openRecords}>
            <Trophy size={20} />
            Records
          </button>
          <button className="secondary-action" onClick={openLevels}>
            <Map size={20} />
            Niveaux
          </button>
          <button className="secondary-action" onClick={openSettings}>
            <Settings size={20} />
            Parametres
          </button>
        </Overlay>
      )}

      {gameState.screen === 'settings' && (
        <Overlay title="Parametres" subtitle="Options de jeu">
          <div className="settings-list">
            <div className="setting-group">
              <h2>Audio</h2>
              <AudioSlider
                icon={<Volume2 size={22} />}
                label="Volume general"
                value={audio.masterVolume}
                onChange={(value) => setAudioVolume('masterVolume', value)}
              />
              <AudioSlider
                icon={<Music size={22} />}
                label="Musique"
                value={audio.musicVolume}
                onChange={(value) => setAudioVolume('musicVolume', value)}
              />
              <AudioSlider
                icon={<Zap size={22} />}
                label="Effets sonores"
                value={audio.sfxVolume}
                onChange={(value) => setAudioVolume('sfxVolume', value)}
              />
            </div>
            <div className="setting-row static">
              <Gamepad2 size={22} />
              <span>
                <strong>Manette</strong>
                <small>Stick ou croix pour bouger, A saut, X/Y attaque, B/RB dash, LB/LT parade</small>
              </span>
            </div>
          </div>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'records' && (
        <Overlay title="Meilleurs temps" subtitle="Records sauvegardes">
          <div className="records-list">
            {LEVELS.map((level, index) => (
              <div className="record-row" key={level.id}>
                <span>{index + 1}</span>
                <strong>{level.name}</strong>
                <b>{formatTime(gameState.records.levels[level.id], '--:--')}</b>
              </div>
            ))}
            <div className="record-row global">
              <span>SR</span>
              <strong>Speedrun complet</strong>
              <b>{formatTime(gameState.records.global, '--:--')}</b>
            </div>
          </div>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'levelSelect' && (
        <Overlay title="Selection de niveau" subtitle="Progression aventure">
          <div className="level-grid">
            {LEVELS.map((level, index) => {
              const locked = index > gameState.maxUnlocked
              return (
                <button
                  key={level.id}
                  className="level-button"
                  disabled={locked}
                  onClick={() => game?.startLevel(index)}
                >
                  <span>{index + 1}</span>
                  <strong>{level.name}</strong>
                  <small>{locked ? 'Verrouille' : level.shortName}</small>
                </button>
              )
            })}
          </div>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'paused' && (
        <Overlay title="Pause" subtitle={LEVELS[gameState.levelIndex]?.name}>
          <button className="primary-action" onClick={resume}>
            <Play size={21} />
            Reprendre
          </button>
          <button className="secondary-action" onClick={restart}>
            <RotateCcw size={20} />
            Recommencer
          </button>
          <button className="secondary-action" onClick={openLevels}>
            <Map size={20} />
            Niveaux
          </button>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'gameOver' && (
        <Overlay title="Game over" subtitle="Le cristal se reforme au dernier checkpoint">
          <button className="primary-action" onClick={restart}>
            <RotateCcw size={21} />
            Rejouer
          </button>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'levelComplete' && (
        <Overlay title="Niveau termine" subtitle={`${gameState.fragments} fragments recuperes`}>
          <LevelResult result={gameState.lastLevelResult} />
          {gameState.levelIndex < LEVELS.length - 1 && (
            <button className="primary-action" onClick={next}>
              <ChevronRight size={21} />
              Continuer
            </button>
          )}
          <button className="secondary-action" onClick={openLevels}>
            <Map size={20} />
            Niveaux
          </button>
        </Overlay>
      )}

      {gameState.screen === 'speedrunLevelComplete' && (
        <Overlay title="Niveau valide" subtitle="Le niveau suivant va commencer">
          <LevelResult result={gameState.speedrun.lastLevelResult || gameState.lastLevelResult} />
          <div className="result-card">
            <strong>Chrono global</strong>
            <span>{formatTime(gameState.timer.globalTime)}</span>
          </div>
        </Overlay>
      )}

      {gameState.screen === 'speedrunComplete' && (
        <Overlay title="Speedrun termine" subtitle="Run complete des 10 niveaux">
          <div className="result-card large">
            <strong>Temps total</strong>
            <span>{formatTime(gameState.speedrun.finalResult?.totalTime)}</span>
            {gameState.speedrun.finalResult?.isNewRecord && <em>Nouveau record global !</em>}
            <small>Meilleur temps : {formatTime(gameState.speedrun.finalResult?.bestTime, '--:--')}</small>
          </div>
          <button className="primary-action" onClick={startSpeedrun}>
            <Timer size={21} />
            Relancer
          </button>
          <button className="secondary-action" onClick={openRecords}>
            <Trophy size={20} />
            Records
          </button>
          <button className="secondary-action" onClick={openMenu}>
            <Home size={20} />
            Menu
          </button>
        </Overlay>
      )}

      {gameState.screen === 'confirmQuitSpeedrun' && (
        <Overlay title="Abandonner la run ?" subtitle="Le temps global ne sera pas enregistre">
          <button className="primary-action" onClick={cancelQuitSpeedrun}>
            <Play size={21} />
            Continuer
          </button>
          <button className="secondary-action" onClick={confirmQuitSpeedrun}>
            <Home size={20} />
            Abandonner
          </button>
        </Overlay>
      )}

      {gameState.screen === 'victory' && (
        <Overlay title="Victoire" subtitle="Ascend est libere">
          <div className="victory-mark">
            <Trophy size={46} />
          </div>
          <LevelResult result={gameState.lastLevelResult} />
          <button className="primary-action" onClick={() => game?.startLevel(0)}>
            <Play size={21} />
            Nouvelle partie
          </button>
          <button className="secondary-action" onClick={openLevels}>
            <Map size={20} />
            Niveaux
          </button>
        </Overlay>
      )}
    </main>
  )
}

function LevelResult({ result }) {
  if (!result) return null

  return (
    <div className="result-card">
      <strong>{result.levelName}</strong>
      <span>Temps : {formatTime(result.levelTime)}</span>
      <small>Record : {formatTime(result.bestTime, '--:--')}</small>
      {result.isNewRecord && <em>Nouveau record !</em>}
    </div>
  )
}

function AudioSlider({ icon, label, value, onChange }) {
  return (
    <label className="audio-slider">
      {icon}
      <span>{label}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <b>{Math.round(value * 100)}%</b>
    </label>
  )
}

function formatTime(seconds, empty = '--:--') {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return empty
  }
  const minutes = Math.floor(seconds / 60)
  const wholeSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}

function Overlay({ title, subtitle, children }) {
  return (
    <section className="overlay">
      <div className="panel">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="actions">{children}</div>
      </div>
    </section>
  )
}

export default App
