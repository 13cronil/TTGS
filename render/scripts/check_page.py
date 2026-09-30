"""Smoke-test the site in docs/: phone width, light + dark, no horizontal overflow,
accordion opens and its clip plays. Screenshots go to render/out/.

Note: Playwright's Chromium has no H.264, so it plays the .webm fallback — that is expected.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from _serve import serve

DOCS = Path(__file__).resolve().parents[2] / 'docs'
OUT = Path(__file__).resolve().parents[1] / 'out'
PLAYING = "[...document.querySelectorAll('video.clip')].filter(v=>!v.paused).map(v=>v.dataset.clip)"

def main():
    OUT.mkdir(exist_ok=True)
    httpd, base = serve(DOCS)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for theme in ('light', 'dark'):
            pg = b.new_page(viewport={'width': 390, 'height': 900}, device_scale_factor=2,
                            color_scheme=theme)
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'{base}/index.html'); pg.wait_for_timeout(800)
            assert pg.evaluate("document.querySelectorAll('.open').length") == 0, 'something starts expanded'
            pg.locator('.ex-head', has_text='Pull-ups').click(); pg.wait_for_timeout(600)
            pg.locator('video[data-clip=pullup]').scroll_into_view_if_needed(); pg.wait_for_timeout(1200)
            print(theme, 'playing:', pg.evaluate(PLAYING),
                  'overflow px:', pg.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'),
                  'errors:', errs)
            pg.screenshot(path=str(OUT / f'page_{theme}.png'), full_page=True)
            pg.close()
        b.close()
    httpd.shutdown()

if __name__ == '__main__':
    main()
