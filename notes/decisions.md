# Decisions and open questions

A running log of why the programme and the page are the way they are. Newest first within each section.

## Programme

- **Block pulls alternate by session.** Session A is an edge block: holds 1–2 in half crimp, holds 3–4 in full crimp. Session B is a wide pinch block.
  Both are 4 × 10 s per hand, with 3 min between holds on the same hand (the other hand's hold goes in the middle), after a 40/60/80% ramp.
  - Full crimp puts the highest load on the A2 pulley (3–4× fingertip force; Miro/Schöffl 2021, cited in
    research/finger-strength-hangboard-vs-blocks.md). So it's done last, starting lighter than the half-crimp weight, and dropped
    for the day if a finger feels tweaky. The ordering and the lighter start are a precaution, not an established protocol.
  - Open hand was dropped as a trained grip, which leaves it to climbing. The owner accepted this trade.
- **The wide pinch moved out of the wrist battery** and into the block pulls. It's a near-maximal grip isometric using the same kit and set structure,
  so it belongs with the fingers, done fresh before climbing. The wrist battery is now 4 light movements
  (curl, reverse curl, rotation, tilt), at 10–15 reps with 2–3 in reserve, done after climbing (Hooper's Beta template).
- **Time budget corrected:** about 15 min before climbing, about 40 min after. The earlier 12 and 30 were arithmetic errors. Face pulls go in the
  rests between press sets to stay under 45.
- **Frequency:** twice a week is enough when weekly volume is matched (Grgic et al., Sports Med Open).
  Stop about 2 reps short of failure (RIR 2). Every fifth week is a deload at about 2/3 of the weight.
- **Pull-ups:** Session A is 5 × 3–5 heavy and Session B is 4 × 6–8 easy. Add 2.5 kg when the top set hits 5. Use negatives if they can't yet do 5.
  (The pull-up A/B is independent of the block-pull A/B, but both follow the same session.)
- **Dumbbell bench press, not a floor press:** this was the owner's call.
- **Hypermobility, elbow and mantle framing removed** at the owner's request, so it's a general climber routine. The research doc on
  hypermobility is kept for reference only.

## Page and video

- The canvas and SVG stick figures were replaced with **3D-rendered looping videos** (three.js mannequin, frame-stepped capture, ffmpeg).
  The owner wanted "professional fitness-app" production value.
- Every video has phase pills (for example SET SHOULDERS → PULL · 1s → LOWER · 2s) that fill as the rep plays, plus 1–2 callouts on the
  common mistake. Working segments are tinted accent-blue only where it's unambiguous (forearm and hand for grip and wrist work).
- The wrist clips moved to one column so the burned-in text stays readable on phones.
- **Everything starts collapsed**, including the Session A and Session B sub-panels.
- Both MP4 (H.264) and WebM (VP9) are shipped. Open-source Chromium, including Playwright's, has no H.264 and uses the WebM.

## Open questions and ideas

- **"Wrist cocked back" in the pinch** is interpreted as wrist extension with the palm facing the thigh. The source (Hörst, via
  research/hypermobility-elbow-mantle.md: "wide-pinch extension") is not specific about the exact hand orientation. It's worth
  checking against a video from Hörst or Lattice and re-rendering `pinch` if needed.
- The edge-block clip shows the whole body, so the half crimp and full crimp look the same. A close-up hand clip showing both grips
  would help a novice.
- The MP4s total about 11 MB. CRF 23–24 would roughly halve that with little visible loss, since the backdrop is dithered.
- Possible additions: a printable one-page summary, and a simple log (weights per session) if the friend wants to track progression.
