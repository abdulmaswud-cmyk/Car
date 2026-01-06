export type DifficultyId = 'easy' | 'medium' | 'hard'

export type ObstacleKind = 'low' | 'high'

export type CarOption = {
  id: string
  name: string
  bodyColor: string
  accentColor: string
}

export type DifficultyOption = {
  id: DifficultyId
  name: string
  initialSpeedPxPerSec: number
  initialSpawnIntervalSec: number
}

export type Obstacle = {
  id: string
  lane: number // 0..3
  kind: ObstacleKind
  y: number // canvas-space top coordinate
  width: number
  height: number
}

export type PlayerPose = 'normal' | 'jumping' | 'sliding'

export type GameOverStats = {
  score: number
  timeSurvivedSec: number
  distancePx: number
  difficultyId: DifficultyId
}

