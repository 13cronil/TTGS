# Climb Day Strength

A two-day-a-week strength routine for climbers, bolted onto climbing sessions: about 15 minutes before and 40 after.
It's one static page with looping 3D demo videos for every exercise.

**Site:** `docs/index.html`, with the videos in `docs/v/`.

## Publish on GitHub Pages

1. Push this repo to GitHub. The repo must be public on the free plan.
2. Go to **Settings → Pages → Build and deployment** and choose **Deploy from a branch**, with branch `main` and folder `/docs`.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.

## Preview locally

```bash
cd docs && python -m http.server 8000   # open http://localhost:8000
```

(Opening `index.html` straight from disk works too, but serving it avoids browser quirks with video.)

## Re-render the videos

See `CLAUDE.md` → *Video pipeline*. In short:

```bash
cd render && npm install
pip install playwright pillow && playwright install chromium
python scripts/stills.py pullup      # quick preview → render/out/sheet.png
python scripts/render.py pullup      # → docs/v/pullup.mp4/.webm/.jpg
```

## Where things come from

- `research/`: the evidence reviews behind the programme.
- `notes/decisions.md`: what was decided and why, plus open questions.

General training guidance, not medical advice.
