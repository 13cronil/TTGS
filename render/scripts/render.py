"""Render exercise clips to docs/v/<name>.mp4 (H.264), .webm (VP9 fallback) and .jpg (poster).

Usage (from the render/ folder, after `npm install`):
    python scripts/render.py                 # all clips
    python scripts/render.py pullup curl     # just these

Frames are stepped deterministically (renderAt(t) at a fixed fps), so output is smooth
regardless of machine speed. Headless WebGL runs on SwiftShader: ~0.5 s per frame on 2 CPUs.
"""
import base64, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
from _serve import serve

ROOT = Path(__file__).resolve().parents[1]          # render/
OUT = ROOT.parent / "docs" / "v"
ORDER = ['rockback', 'blockpull', 'pullup', 'dbpress', 'facepull', 'curl', 'seated',
         'kneeraise', 'lsit', 'wcurl', 'wrev', 'wrot', 'wdev', 'pinch']
GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

def main(names):
    OUT.mkdir(parents=True, exist_ok=True)
    httpd, base = serve(ROOT)
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        for n in names:
            t0 = time.time()
            pg.goto(f'{base}/index.html?ex={n}')
            pg.wait_for_function('window.READY===true', timeout=60000)
            m = pg.evaluate('meta'); N, fps = m['frames'], m['fps']
            mp4 = OUT / f'{n}.mp4'
            ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps),
                                   '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '21',
                                   '-tune', 'animation', '-pix_fmt', 'yuv420p', '-g', str(fps * 2),
                                   '-movflags', '+faststart', str(mp4)], stdin=subprocess.PIPE)
            for i in range(N):
                pg.evaluate(f'renderAt({i / fps})')
                ff.stdin.write(base64.b64decode(pg.evaluate('grab("image/jpeg",0.96)').split(',')[1]))
            ff.stdin.close(); ff.wait()
            # poster frame ~30% into the loop
            pg.evaluate(f'renderAt({m["total"] * 0.3})')
            (OUT / f'{n}.jpg').write_bytes(base64.b64decode(pg.evaluate('grab("image/jpeg",0.82)').split(',')[1]))
            # VP9 fallback for browsers without H.264 (e.g. open-source Chromium)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(mp4), '-c:v', 'libvpx-vp9', '-crf', '35',
                            '-b:v', '0', '-row-mt', '1', '-cpu-used', '4', '-deadline', 'good', '-an',
                            str(OUT / f'{n}.webm')], check=True)
            warn = pg.evaluate('[...new Set(window.warnings)].slice(0,5)')
            print(f'{n}: {N} frames, {time.time() - t0:.0f}s' + (f'  IK warnings: {warn}' if warn else ''), flush=True)
        b.close()
    httpd.shutdown()
    if errs: print('page errors:', errs)

if __name__ == '__main__':
    main(sys.argv[1:] or ORDER)
