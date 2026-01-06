import type { CarOption, DifficultyOption, DifficultyId } from '../game/types'
import './StartScreen.css'

export function StartScreen(props: {
  cars: readonly CarOption[]
  difficulties: readonly DifficultyOption[]
  selectedCarId: string
  selectedDifficultyId: DifficultyId
  onSelectCar: (carId: string) => void
  onSelectDifficulty: (difficultyId: DifficultyId) => void
  onStart: () => void
}) {
  const { cars, difficulties } = props

  return (
    <section className="start">
      <div className="panel">
        <h1 className="title">Start a run</h1>
        <p className="subtitle">
          Use <strong>arrow keys</strong> (← → ↑ ↓) or <strong>click a lane</strong> to move. Press{' '}
          <strong>P</strong> / <strong>Esc</strong> to pause.
        </p>

        <div className="grid">
          <div className="block">
            <div className="blockTitle">Choose a car</div>
            <div className="cards" role="list">
              {cars.map((car) => {
                const selected = car.id === props.selectedCarId
                return (
                  <button
                    key={car.id}
                    type="button"
                    className={`carCard ${selected ? 'selected' : ''}`}
                    onClick={() => props.onSelectCar(car.id)}
                    aria-pressed={selected}
                  >
                    <div className="carSwatch" aria-hidden="true">
                      <span className="swatchBody" style={{ background: car.bodyColor }} />
                      <span className="swatchAccent" style={{ background: car.accentColor }} />
                    </div>
                    <div className="carName">{car.name}</div>
                    <div className="carMeta">Cosmetic only</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="block">
            <div className="blockTitle">Difficulty</div>
            <div className="difficulty">
              {difficulties.map((d) => {
                const checked = d.id === props.selectedDifficultyId
                return (
                  <label key={d.id} className={`diffRow ${checked ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="difficulty"
                      value={d.id}
                      checked={checked}
                      onChange={() => props.onSelectDifficulty(d.id)}
                    />
                    <div className="diffName">{d.name}</div>
                    <div className="diffMeta">
                      <span className="pill">speed: {d.initialSpeedPxPerSec}</span>
                      <span className="pill">spawn: {d.initialSpawnIntervalSec.toFixed(2)}s</span>
                    </div>
                  </label>
                )
              })}
            </div>

            <button type="button" className="startBtn" onClick={props.onStart}>
              Start
            </button>
          </div>
        </div>

        <div className="hint">
          Tip: Jump clears <strong>low</strong> obstacles. Slide clears <strong>high</strong> (overhead) obstacles.
        </div>
      </div>
    </section>
  )
}

