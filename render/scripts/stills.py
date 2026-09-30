"""Quick look before a full render: 4 stills per clip + a contact sheet in render/out/.

    python scripts/stills.py pullup curl       # writes render/out/sheet.png
"""
import base64, sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from _serve import serve
from render import ORDER, GL_ARGS

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out'

def main(names):
    OUT.mkdir(exist_ok=True)
    httpd, base = serve(ROOT)
    rows = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=GL_ARGS)
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        for n in names:
            pg.goto(f'{base}/index.html?ex={n}'); pg.wait_for_function('window.READY===true', timeout=60000)
            total = pg.evaluate('meta.total'); ims = []
            for k in range(4):
                pg.evaluate(f'renderAt({total * (k + 0.5) / 4})')
                f = OUT / f'{n}_{k}.png'
                f.write_bytes(base64.b64decode(pg.evaluate('grab("image/png")').split(',')[1]))
                ims.append(Image.open(f).resize((640, 400)))
            row = Image.new('RGB', (2560, 400)); [row.paste(im, (640 * i, 0)) for i, im in enumerate(ims)]; rows.append(row)
            w = pg.evaluate('[...new Set(window.warnings)].slice(0,5)')
            if w: print(n, 'IK warnings:', w)
        b.close()
    httpd.shutdown()
    sheet = Image.new('RGB', (2560, 400 * len(rows))); [sheet.paste(r, (0, 400 * i)) for i, r in enumerate(rows)]
    sheet.save(OUT / 'sheet.png'); print('wrote', OUT / 'sheet.png')

if __name__ == '__main__':
    main(sys.argv[1:] or ORDER)
