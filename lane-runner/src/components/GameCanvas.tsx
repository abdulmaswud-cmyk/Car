import { useEffect, useMemo, useRef, useState } from 'react'
import type { CarOption, DifficultyOption, GameOverStats, Obstacle } from '../game/types'
import { LaneRunnerSim } from '../game/sim'
import './GameCanvas.css'

type Viewport = { w: number; h: number; dpr: number }

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function formatTime(sec: number): string {
  const s = Math.max(0, sec)
  const mm = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function GameCanvas(props: {
  car: CarOption
  difficulty: DifficultyOption
  paused: boolean
  showGameOverOverlay: boolean
  lastRun: GameOverStats | null
  onPauseToggle: () => void
  onGameOver: (stats: GameOverStats) => void
  onRestart: () => void
  onExitToStart: () => void
}) {
  const { paused, showGameOverOverlay, onPauseToggle, onExitToStart, onGameOver } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const simRef = useRef<LaneRunnerSim | null>(null)
  const viewportRef = useRef<Viewport>({ w: 900, h: 560, dpr: 1 })

  const [hud, setHud] = useState(() => ({
    score: 0,
    timeSec: 0,
    speed: props.difficulty.initialSpeedPxPerSec,
  }))
  const hudRef = useRef(hud)
  useEffect(() => {
    hudRef.current = hud
  }, [hud])

  const sim = useMemo(() => new LaneRunnerSim({ difficulty: props.difficulty, lanes: 4 }), [props.difficulty])

  // Initialize sim once (memo keeps it stable for the run).
  useEffect(() => {
    simRef.current = sim
  }, [sim])

  // Resize canvas to container with devicePixelRatio for sharpness.
  useEffect(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
      const w = Math.max(320, Math.floor(rect.width))
      const h = Math.max(420, Math.floor(rect.height))
      viewportRef.current = { w, h, dpr }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard controls.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault()
        onPauseToggle()
        return
      }
      if (paused || showGameOverOverlay) return

      const simNow = simRef.current
      if (!simNow) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          simNow.moveLeft()
          break
        case 'ArrowRight':
          e.preventDefault()
          simNow.moveRight()
          break
        case 'ArrowUp':
          e.preventDefault()
          simNow.jump()
          break
        case 'ArrowDown':
          e.preventDefault()
          simNow.slide()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onPauseToggle, paused, showGameOverOverlay])

  // Game loop + rendering.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const step = (ts: number) => {
      rafRef.current = requestAnimationFrame(step)

      const vp = viewportRef.current
      const dpr = vp.dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const last = lastTsRef.current
      lastTsRef.current = ts
      const dt = last ? (ts - last) / 1000 : 1 / 60

      const simNow = simRef.current
      if (!simNow) return

      const world = buildWorld(simNow, vp.w, vp.h)
      if (!paused && !showGameOverOverlay) {
        simNow.update(dt, world)
        const snap = simNow.getSnapshot()
        if (snap.crashed) {
          onGameOver(simNow.getGameOverStats())
        }
      }

      const snap = simNow.getSnapshot()
      draw(
        ctx,
        vp.w,
        vp.h,
        props.car,
        snap,
        (o) => simNow.getObstacleRect(o, world.roadX, world.roadW),
        world.car,
      )

      // Throttle HUD state updates to avoid re-rendering at 60fps.
      if (ts % 100 < 16) {
        const next = { score: Math.floor(snap.score), timeSec: snap.timeSec, speed: snap.speedPxPerSec }
        if (
          next.score !== hudRef.current.score ||
          Math.floor(next.timeSec) !== Math.floor(hudRef.current.timeSec) ||
          Math.floor(next.speed) !== Math.floor(hudRef.current.speed)
        ) {
          setHud(next)
        }
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [onGameOver, paused, props.car, showGameOverOverlay])

  const onPointerDown = (e: React.PointerEvent) => {
    if (paused || showGameOverOverlay) return
    const canvas = canvasRef.current
    const simNow = simRef.current
    if (!canvas || !simNow) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const road = roadForSize(rect.width, rect.height)
    const laneW = road.roadW / 4
    const clamped = Math.max(0, Math.min(road.roadW - 1, x - road.roadX))
    const lane = Math.floor(clamped / laneW)
    simNow.moveToLane(lane)
  }

  return (
    <div className="gameWrap">
      <div className="hud">
        <div className="hudRow">
          <div className="hudItem">
            <div className="hudLabel">Score</div>
            <div className="hudValue">{hud.score}</div>
          </div>
          <div className="hudItem">
            <div className="hudLabel">Time</div>
            <div className="hudValue">{formatTime(hud.timeSec)}</div>
          </div>
          <div className="hudItem">
            <div className="hudLabel">Speed</div>
            <div className="hudValue">{Math.floor(hud.speed)}</div>
          </div>
        </div>
        <div className="hudHint">← → move • ↑ jump • ↓ slide • click a lane to switch</div>
      </div>

      <div className="canvasStage" ref={containerRef}>
        <canvas ref={canvasRef} className="canvas" onPointerDown={onPointerDown} />

        {paused ? (
          <div className="overlay" role="dialog" aria-label="Paused">
            <div className="overlayCard">
              <div className="overlayTitle">Paused</div>
              <div className="overlayText">Press P / Esc to resume.</div>
              <div className="overlayActions">
                <button type="button" className="btn" onClick={onPauseToggle}>
                  Resume
                </button>
                <button type="button" className="btn btnGhost" onClick={onExitToStart}>
                  Exit
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showGameOverOverlay ? (
          <div className="overlay" role="dialog" aria-label="Game over">
            <div className="overlayCard">
              <div className="overlayTitle">Game over</div>
              <div className="stats">
                <div className="statRow">
                  <div className="statLabel">Score</div>
                  <div className="statValue">{props.lastRun?.score ?? 0}</div>
                </div>
                <div className="statRow">
                  <div className="statLabel">Time</div>
                  <div className="statValue">{formatTime(props.lastRun?.timeSurvivedSec ?? 0)}</div>
                </div>
              </div>
              <div className="overlayActions">
                <button type="button" className="btn" onClick={props.onRestart}>
                  Restart
                </button>
                <button type="button" className="btn btnGhost" onClick={props.onExitToStart}>
                  Back to start
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function roadForSize(w: number, h: number) {
  const roadX = Math.floor(w * 0.08)
  const roadW = Math.floor(w * 0.84)
  const roadY = 22
  const roadH = h - 44
  const roadBottom = roadY + roadH
  return { roadX, roadW, roadY, roadH, roadBottom }
}

function buildWorld(sim: LaneRunnerSim, w: number, h: number) {
  const road = roadForSize(w, h)
  const laneWidth = road.roadW / 4
  const lanePadding = laneWidth * 0.2

  const pose = sim.getPlayerPose()
  const lane = sim.getPlayerLane()

  const baseCarW = laneWidth * 0.56
  const baseCarH = 46
  const slideH = 28
  const carW = baseCarW
  const carH = pose.pose === 'sliding' ? slideH : baseCarH

  const baseCarY = road.roadBottom - carH - 10

  const jumpH = 64
  const jumpT = pose.pose === 'jumping' ? Math.min(1, pose.poseT / 0.6) : 0
  const jumpOffset = pose.pose === 'jumping' ? -Math.sin(Math.PI * jumpT) * jumpH : 0

  const x =
    road.roadX + lane * laneWidth + lanePadding + (laneWidth - 2 * lanePadding - carW) / 2

  const y = baseCarY + jumpOffset

  return {
    width: w,
    height: h,
    roadX: road.roadX,
    roadW: road.roadW,
    car: { x, y, w: carW, h: carH },
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  car: CarOption,
  snap: { lane: number; pose: string; obstacles: readonly Obstacle[]; crashed: boolean },
  obstacleRect: (o: Obstacle) => { x: number; y: number; w: number; h: number },
  carRect: { x: number; y: number; w: number; h: number },
) {
  // Background (soft, non-harsh)
  ctx.clearRect(0, 0, w, h)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#eff6ff')
  bg.addColorStop(1, '#ecfeff')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Road
  const road = roadForSize(w, h)
  const roadX = road.roadX
  const roadW = road.roadW
  const roadY = road.roadY
  const roadH = road.roadH
  ctx.fillStyle = 'rgba(15, 23, 42, 0.08)'
  roundRectPath(ctx, roadX, roadY, roadW, roadH, 18)
  ctx.fill()

  // Lanes
  const laneW = roadW / 4
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)'
  ctx.lineWidth = 2
  for (let i = 1; i < 4; i++) {
    const x = roadX + i * laneW
    ctx.beginPath()
    ctx.moveTo(x, roadY + 10)
    ctx.lineTo(x, roadY + roadH - 10)
    ctx.stroke()
  }

  // Obstacles
  for (const o of snap.obstacles) {
    const r = obstacleRect(o)
    if (r.y > h + 60) continue
    if (r.y + r.h < -60) continue

    if (o.kind === 'low') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.80)' // soft red
      roundRectPath(ctx, r.x, r.y, r.w, r.h, 8)
      ctx.fill()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, 2)
    } else {
      // Overhead obstacle (hangs down)
      ctx.fillStyle = 'rgba(99, 102, 241, 0.75)' // soft indigo
      roundRectPath(ctx, r.x, r.y, r.w, r.h, 8)
      ctx.fill()
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)'
      ctx.fillRect(r.x + 10, r.y + r.h - 4, r.w - 20, 2)
    }
  }

  // Car
  const crashedTint = snap.crashed ? 'rgba(239, 68, 68, 0.25)' : null
  ctx.fillStyle = crashedTint ?? car.bodyColor
  roundRectPath(ctx, carRect.x, carRect.y, carRect.w, carRect.h, 12)
  ctx.fill()

  // Accent stripe
  ctx.fillStyle = car.accentColor
  const stripeH = Math.max(6, Math.floor(carRect.h * 0.22))
  roundRectPath(ctx, carRect.x + 8, carRect.y + 8, carRect.w - 16, stripeH, 999)
  ctx.fill()

  // Window
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)'
  const winW = Math.floor(carRect.w * 0.42)
  const winH = Math.floor(carRect.h * 0.36)
  roundRectPath(ctx, carRect.x + carRect.w * 0.48, carRect.y + carRect.h * 0.20, winW, winH, 8)
  ctx.fill()
}

