# CLAUDE.md: Climb Day Strength

Context for Claude Code, carried over from the claude.ai conversation where this was built.

## What this is

A single-page strength routine for an **intermediate climber (a friend of the repo owner)** who climbs
bouldering, lead and auto-belay. Everything happens on climbing days, **twice a week**, with at least two days between sessions:

- **Before climbing (~15 min):** warm-up, then block pulls. Session A uses an edge block in half crimp then full crimp. Session B uses a wide pinch block.
- **After climbing (~40 min):** pull-ups, dumbbell press, face pulls (done in the rests between press sets), slow curls,
  seated leg lifts, knee raises and L-sit tuck progression, then the wrist battery (4 movements with one dumbbell).

Goals: finger strength, stronger wrists and elbows, more pull-ups, an L-sit, lower injury risk.
The audience is a novice at these exercises, so the page stays plain and "idiot-proof". The top of the page has a summary card, and each exercise is an
expandable panel with a looping demo video.

## Repo layout

```
docs/                 ← the deployable site (GitHub Pages: branch main, folder /docs)
  index.html          ← CANONICAL page source. Hand-written HTML/CSS/JS, no build step.
  v/<clip>.mp4|.webm|.jpg   ← 14 demo clips (H.264 + VP9 fallback + poster)
  .nojekyll
render/               ← the pipeline that produces docs/v/*
  index.html, main.js ← render harness page (one clip per ?ex=<name>)
  engine.js           ← studio scene, IK mannequin, equipment, overlay compositor, timeline
  exercises.js        ← choreography: one spec per clip (EX.<name>), ORDER list
  scripts/render.py   ← frame-stepped capture → ffmpeg → docs/v/
  scripts/stills.py   ← 4 stills per clip + contact sheet (fast preview before a full render)
  scripts/check_page.py ← phone-width light/dark smoke test of docs/
  scripts/check_poses.mjs ← node sanity check: IK over-reach warnings, loop lengths
research/             ← evidence reviews the programme is based on (from the claude.ai Project)
notes/decisions.md    ← why things are the way they are; open questions
notes/archive/        ← superseded early plan (3 days/week + hypermobility framing, no longer used)
```

## Page (docs/index.html)

- One file with inline CSS and JS. Fonts are Barlow and Barlow Condensed from Google Fonts. There's no framework.
- Design tokens live on `:root`, with dark mode set both via `prefers-color-scheme` and `[data-theme="dark"]`. Keep both in sync.
- Accordions: an `.ex` panel toggles `.open`, and its body animates by switching `grid-template-rows` from 0fr to 1fr. Inside the Block pulls panel
  there are nested `.sess` sub-panels (Session A and Session B) that work the same way. **Everything starts collapsed.**
- Videos are `<video class="clip" data-clip=… muted loop playsinline preload="none">` with an mp4 source and a webm source.
  The JS plays a clip only when every ancestor `.ex`/`.sess` is open **and** it's on screen (IntersectionObserver),
  pauses it otherwise, and tapping a clip toggles play/pause. `prefers-reduced-motion` means no autoplay, and controls are shown instead.
  Only treat `NotAllowedError` from `play()` as "autoplay blocked" (show controls). An `AbortError` from a pause racing a play is normal.
- Known past bug: `display:grid` on list items that mix `<b>` with text splits the text into one fragment per row. `ol.how li`
  is `display:block` with an absolutely positioned counter badge. Don't put mixed inline content in grid containers.
- Must work at 390px width with no horizontal overflow, in both themes. Run `python render/scripts/check_page.py`.

## Video pipeline (render/)

Each clip is a deterministic loop rendered from code. Nothing is keyframed by hand in a DCC tool.

- **Scene:** three.js r169. The mannequin uses tapered cylinders for limbs, sphere joints, and a swept superellipse torso rebuilt every frame.
  Lighting is a studio setup: hemisphere light, key light with PCF soft shadows, fill, rim, and a RoomEnvironment for reflections. It uses NeutralToneMapping.
  The WebGL canvas is transparent and is composited over a 2D gradient backdrop with dither noise, which stops H.264 banding.
- **World frame:** metres, floor at y=0. The **figure faces +X, its right side is +Z** (usually the side nearest the camera).
- **Rig (`solve(p)` in engine.js):** pose params → joint positions.
  - Torso: `pelvis` (xyz), `pitch` (forward lean, rad), `curl` (upper-spine rounding), `shrug` (+ elevate / − depress, metres),
    `protract`, `head`.
  - Arms: two-bone IK from the shoulder to a wrist target `h` (or `hRel` relative to the shoulder), with elbow pole `e`. The palm normal is `n`.
    Wrist flexion is `wf` (+ = flexion), deviation is `wd` (+ = radial), finger curl is `grip` 0..1. An absolute hand direction `Dh` overrides wf/wd.
    Setting `E` + `F` instead of `h` gives an explicit elbow position and forearm direction, e.g. a forearm resting on the thigh.
  - Legs: IK from the hip to ankle target `a` (or `aRel`) with knee pole `k`. Toe direction is `t` and the foot's top direction is `fu`.
  - Symmetric keys (for example `h`) describe the RIGHT side, and the left side is mirrored in z. A per-side override is `<key>R` / `<key>L`.
  - `pelvisFor(p, shoulderCentre)` solves the pelvis so the shoulders land where the hands demand. It's used for hanging and support poses.
- **Spec (`EX.<name>` in exercises.js):**
  `{ chips, cam:{look,az,el,dist,orbit,fov?}, shadow:{c,r}, tint?, base, segs:[{d, chip?, to?, ease?}], cues, pre?, props }`
  - `segs` is the timeline. Each segment tweens from the previous pose to `to` over `d` seconds. A segment without `to` is a hold. Poses accumulate, and the
    last pose flows into the first, so every clip loops seamlessly.
  - `chip` indexes the phase pill along the bottom of the video, whose fill shows progress. `cues` are leader-line callouts shown during the listed `seg`
    indexes. They're auto-clamped inside the frame and kept clear of the chip band.
  - `pre(p)` lets a spec derive rig params procedurally. For example, `rockback` solves the torso pitch that keeps the arms straight, and `wrot`
    maps a rotation angle to a palm normal.
  - `props(st)` builds equipment and returns `{update(J)}` for anything that follows the hands (dumbbells, band, cord and loading pin).
- **Camera:** chosen per clip for legibility. Curls, leg lifts and wrist flexion are side-on. Wrist rotation is front-on,
  because the lever swings across the view. A small sinusoidal orbit adds parallax and still loops.
- **Output:** 1280×800 at 30fps, rendered at a 1.4× supersample and downscaled. H.264 at CRF 21 is about 0.5–1.2 MB per clip. The VP9 fallback is about 0.2–0.4 MB.
- **Workflow for changing a clip:**
  1. edit `render/exercises.js` (or `engine.js`)
  2. `node render/scripts/check_poses.mjs`, which should print no over-reach warnings
  3. `python render/scripts/stills.py <name>` and look at `render/out/sheet.png`
  4. `python render/scripts/render.py <name>`, which writes to docs/v/
- Setup: `cd render && npm install`, then `pip install playwright pillow` and `playwright install chromium` (or point it at an existing Chromium), plus `ffmpeg`
  with libx264 and libvpx-vp9.
- Headless WebGL uses SwiftShader, at about 0.5 s per frame on 2 CPUs. Keep PCFSoft shadows at a 1536 map. VSM was about 4× slower.
- The render page loads fonts from `node_modules/@fontsource/*`, not from Google, so renders work offline and in sandboxes.

## Content rules

- Match the evidence in `research/` and `notes/decisions.md`. Keep the language plain and second-person, with short sentences.
- Finger work: 10 s holds at about 3 s from failure, never to failure, with 3 min between holds on the same hand. Full crimp is lighter and comes last.
- Progression rule on the page: when the last set felt easy, add the smallest jump available. Every fifth week is a deload at about 2/3 of the weight.
- The owner **dropped the hypermobility, elbow and mantle framing on purpose**. Don't reintroduce it. They chose a dumbbell **bench press, not a floor press**.

## Working with the owner

- On coding problems, act like a principal engineer. They like to work code out themselves. Give overviews or
  small examples unless they explicitly ask for code or ask you to make the change.
- No validation or flattery. Be objective and nuanced, say when you're unsure, and avoid ending replies with questions unless you need to.
