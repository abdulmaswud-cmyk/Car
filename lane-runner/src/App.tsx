import { useCallback, useMemo, useState } from 'react'
import './App.css'
import { GameCanvas } from './components/GameCanvas'
import { StartScreen } from './components/StartScreen'
import type { CarOption, DifficultyId, GameOverStats } from './game/types'
import { CARS, DIFFICULTIES } from './game/config'

type Screen = 'start' | 'playing' | 'paused' | 'gameover'

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [runId, setRunId] = useState(0)
  const [difficultyId, setDifficultyId] = useState<DifficultyId>('medium')
  const [carId, setCarId] = useState<CarOption['id']>(CARS[0]?.id ?? 'sunset')
  const [lastRun, setLastRun] = useState<GameOverStats | null>(null)

  const selectedCar = useMemo(() => {
    return CARS.find((c) => c.id === carId) ?? CARS[0]
  }, [carId])

  const selectedDifficulty = useMemo(() => {
    return DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[0]
  }, [difficultyId])

  const onStart = useCallback(() => {
    setLastRun(null)
    setRunId((v) => v + 1)
    setScreen('playing')
  }, [])

  const onPauseToggle = useCallback(() => {
    setScreen((prev) => (prev === 'paused' ? 'playing' : 'paused'))
  }, [])

  const onExitToStart = useCallback(() => {
    setLastRun(null)
    setScreen('start')
  }, [])

  const onGameOver = useCallback((stats: GameOverStats) => {
    setLastRun(stats)
    setScreen('gameover')
  }, [])

  const onRestart = useCallback(() => {
    setLastRun(null)
    setRunId((v) => v + 1)
    setScreen('playing')
  }, [])

  return (
    <div className="app">
      <header className="appHeader">
        <div className="brand">
          <div className="brandTitle">Lane Runner</div>
          <div className="brandSubtitle">4 lanes • jump • slide • survive</div>
        </div>
        <div className="headerActions">
          {screen === 'playing' || screen === 'paused' ? (
            <>
              <button type="button" className="btn" onClick={onPauseToggle}>
                {screen === 'paused' ? 'Resume (P / Esc)' : 'Pause (P / Esc)'}
              </button>
              <button type="button" className="btn btnGhost" onClick={onExitToStart}>
                Exit
              </button>
            </>
          ) : null}
        </div>
      </header>

      <main className="appMain">
        {screen === 'start' ? (
          <StartScreen
            cars={CARS}
            difficulties={DIFFICULTIES}
            selectedCarId={carId}
            selectedDifficultyId={difficultyId}
            onSelectCar={setCarId}
            onSelectDifficulty={setDifficultyId}
            onStart={onStart}
          />
        ) : (
          <div className="gameStage">
            <GameCanvas
              key={`${runId}:${carId}:${difficultyId}`}
              car={selectedCar}
              difficulty={selectedDifficulty}
              paused={screen === 'paused'}
              showGameOverOverlay={screen === 'gameover'}
              lastRun={lastRun}
              onPauseToggle={onPauseToggle}
              onGameOver={onGameOver}
              onRestart={onRestart}
              onExitToStart={onExitToStart}
            />
          </div>
        )}
      </main>
    </div>
  )
}
