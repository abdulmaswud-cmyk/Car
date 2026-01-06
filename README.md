## Lane Runner (from `Car prd.txt`)

This repo contains a small React web game MVP built from the PRD: **Lane Runner**.

### Run locally

```bash
cd lane-runner
npm install
npm run dev
```

### Build / lint

```bash
cd lane-runner
npm run build
npm run lint
```

### What’s included (MVP)

- **4 lanes** with obstacles moving toward the player
- **Controls**
  - Keyboard: **← →** move lanes, **↑** jump, **↓** slide
  - Mouse: **click a lane** to move there
- **Difficulty selection** (Easy / Medium / Hard) before starting
- **Car selection** (visual-only) before starting
- **Progressive scaling**: speed and spawn frequency ramp up over time
- **Game states**: start, gameplay, pause, game over (score + restart)

