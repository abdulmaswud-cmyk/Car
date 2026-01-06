import type { CarOption, DifficultyOption } from './types'

export const DIFFICULTIES: DifficultyOption[] = [
  {
    id: 'easy',
    name: 'Easy',
    initialSpeedPxPerSec: 220,
    initialSpawnIntervalSec: 1.35,
  },
  {
    id: 'medium',
    name: 'Medium',
    initialSpeedPxPerSec: 290,
    initialSpawnIntervalSec: 1.05,
  },
  {
    id: 'hard',
    name: 'Hard',
    initialSpeedPxPerSec: 370,
    initialSpawnIntervalSec: 0.85,
  },
]

export const CARS: CarOption[] = [
  { id: 'sunset', name: 'Sunset', bodyColor: '#f97316', accentColor: '#fb7185' },
  { id: 'ocean', name: 'Ocean', bodyColor: '#0ea5e9', accentColor: '#22c55e' },
  { id: 'mint', name: 'Mint', bodyColor: '#34d399', accentColor: '#60a5fa' },
  { id: 'plum', name: 'Plum', bodyColor: '#a78bfa', accentColor: '#f472b6' },
]

