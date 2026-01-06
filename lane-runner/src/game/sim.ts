import type { DifficultyOption, GameOverStats, Obstacle, ObstacleKind, PlayerPose } from './types'

type Rect = { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export type SimConfig = {
  difficulty: DifficultyOption
  lanes: number
}

export type SimSnapshot = {
  lane: number
  pose: PlayerPose
  poseT: number
  obstacles: readonly Obstacle[]
  speedPxPerSec: number
  timeSec: number
  distancePx: number
  score: number
  crashed: boolean
}

export class LaneRunnerSim {
  readonly lanes: number
  readonly difficulty: DifficultyOption

  private timeSec = 0
  private distancePx = 0
  private score = 0

  private lane = 1
  private pose: PlayerPose = 'normal'
  private poseT = 0

  private speedPxPerSec: number
  private spawnIntervalSec: number
  private spawnCooldownSec: number

  private crashed = false
  private obstacles: Obstacle[] = []

  constructor(cfg: SimConfig) {
    this.lanes = cfg.lanes
    this.difficulty = cfg.difficulty
    this.speedPxPerSec = cfg.difficulty.initialSpeedPxPerSec
    this.spawnIntervalSec = cfg.difficulty.initialSpawnIntervalSec
    this.spawnCooldownSec = this.spawnIntervalSec
  }

  getSnapshot(): SimSnapshot {
    return {
      lane: this.lane,
      pose: this.pose,
      poseT: this.poseT,
      obstacles: this.obstacles,
      speedPxPerSec: this.speedPxPerSec,
      timeSec: this.timeSec,
      distancePx: this.distancePx,
      score: this.score,
      crashed: this.crashed,
    }
  }

  getGameOverStats(): GameOverStats {
    return {
      score: Math.floor(this.score),
      timeSurvivedSec: this.timeSec,
      distancePx: this.distancePx,
      difficultyId: this.difficulty.id,
    }
  }

  moveLeft(): void {
    this.lane = clamp(this.lane - 1, 0, this.lanes - 1)
  }

  moveRight(): void {
    this.lane = clamp(this.lane + 1, 0, this.lanes - 1)
  }

  moveToLane(lane: number): void {
    this.lane = clamp(Math.round(lane), 0, this.lanes - 1)
  }

  jump(): void {
    if (this.pose === 'normal') {
      this.pose = 'jumping'
      this.poseT = 0
    }
  }

  slide(): void {
    if (this.pose === 'normal') {
      this.pose = 'sliding'
      this.poseT = 0
    }
  }

  update(
    dtSec: number,
    world: { width: number; height: number; roadX: number; roadW: number; car: Rect },
  ): void {
    if (this.crashed) return
    if (!Number.isFinite(dtSec) || dtSec <= 0) return

    const dt = clamp(dtSec, 0, 0.05)

    this.timeSec += dt
    this.distancePx += this.speedPxPerSec * dt
    this.score = this.timeSec * 12 + this.distancePx / 18

    // Progressive difficulty scaling (no meaningful cap)
    this.speedPxPerSec *= 1 + 0.005 * dt // ~0.5% per second
    this.spawnIntervalSec = Math.max(0.25, this.spawnIntervalSec * (1 - 0.01 * dt))

    // Pose update
    if (this.pose !== 'normal') {
      this.poseT += dt
      const duration = this.pose === 'jumping' ? 0.6 : 0.75
      if (this.poseT >= duration) {
        this.pose = 'normal'
        this.poseT = 0
      }
    }

    // Spawn obstacles
    this.spawnCooldownSec -= dt
    while (this.spawnCooldownSec <= 0) {
      this.spawnObstacle(world.roadW)
      const jitter = 0.15 * this.spawnIntervalSec
      this.spawnCooldownSec += this.spawnIntervalSec + (Math.random() * 2 - 1) * jitter
    }

    // Move obstacles
    for (const o of this.obstacles) {
      o.y += this.speedPxPerSec * dt
    }
    this.obstacles = this.obstacles.filter((o) => o.y < world.height + 120)

    // Collisions
    const carRect = world.car
    for (const o of this.obstacles) {
      const oRect = this.getObstacleRect(o, world.roadX, world.roadW)
      if (rectsOverlap(carRect, oRect)) {
        this.crashed = true
        break
      }
    }
  }

  private spawnObstacle(roadW: number): void {
    const lane = Math.floor(Math.random() * this.lanes)

    // Avoid spawning too many in the current lane back-to-back.
    const last = this.obstacles[this.obstacles.length - 1]
    const laneBias = last && last.lane === lane ? 0.25 : 0.0
    const roll = Math.random() + laneBias
    const kind: ObstacleKind = roll < 0.6 ? 'low' : 'high'

    const laneWidth = roadW / this.lanes
    const width = Math.floor(laneWidth * 0.58)

    const height = kind === 'low' ? 22 : 26
    const y = -120 - Math.random() * 220

    this.obstacles.push({
      id: makeId('obs'),
      lane,
      kind,
      y,
      width,
      height,
    })
  }

  getPlayerPose(): { pose: PlayerPose; poseT: number } {
    return { pose: this.pose, poseT: this.poseT }
  }

  getPlayerLane(): number {
    return this.lane
  }

  getObstacleRect(o: Obstacle, roadX: number, roadW: number): Rect {
    const laneWidth = roadW / this.lanes
    const lanePadding = laneWidth * 0.2
    const x =
      roadX + o.lane * laneWidth + lanePadding + (laneWidth - 2 * lanePadding - o.width) / 2

    return { x, y: o.y, w: o.width, h: o.height }
  }
}

