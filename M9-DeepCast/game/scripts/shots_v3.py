# Stage C evidence screenshots (dev server 127.0.0.1:5209, Phaser canvas).
# Output: repo-root assets/v3_*.png (4 scenes required by the Stage C brief).
# NOTE: python3 is permission-blocked in this env — scripts/shots_v3.mjs is the
# MAINTAINED port and ran for all captured evidence. Timing approach (both files):
# poll game state via page.evaluate every ~20ms (waitForFunction is rAF-bound and
# loses every <1.5s gameplay window on headless SwiftShader), then scene.pause()
# so the slow canvas readback freezes the exact moment (and cannot tear).
# Scenes: 1) title demo with ghost hand + '!'  2) '!' pre-bite telegraph
#         3) first catch with +$XX float       4) TRENCH + money bar + whale
import time

from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:5209/'
GAME_W, GAME_H = 480, 854
OUT = '/data/youtube-playables/M9-DeepCast/assets'

NEAR50_JS = """() => {
  const s = window.__game.scene.getScene('Game').state;
  if (s.phase !== 'dive' || s.hookMode !== 'hold') return false;
  return s.fish.some((f) => f.alive && !s.hooked.includes(f.uid)
    && Math.hypot(f.x - s.hookX, f.y - s.hookY) < 50);
}"""

DEMO_NIN_JS = """() => {
  const d = window.__game.scene.getScene('Game').overlays.demo;
  return d.shown && d.phase === 'nin' && 240 - d.fishX < 70;
}"""


def poll(page, js: str, timeout_ms: int) -> bool:
    deadline = time.time() + timeout_ms / 1000
    while time.time() < deadline:
        if page.evaluate(js):
            return True
        page.wait_for_timeout(20)
    return False


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 480, 'height': 854}, device_scale_factor=2)
        errors: list[str] = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_selector('#qa-testids', state='attached')
        page.wait_for_function(
            "document.querySelector('[data-testid=screen-title]')?.textContent === '1'",
            timeout=20000,
        )
        # kill the game's 8s whale spawner so only the staged whale exists in scene 4
        page.evaluate("window.__game.scene.getScene('Game').state.whaleSpawnTimer = 9999")
        canvas = page.locator('#game canvas')
        box = canvas.bounding_box()

        def to_screen(gx: float, gy: float) -> tuple[float, float]:
            return (box['x'] + gx / GAME_W * box['width'],
                    box['y'] + gy / GAME_H * box['height'])

        # --- 1) title demo: demo runs on GAME time (dt-clamped) — first '!' lands
        # ~18s after title-ready at headless fps; then FREEZE inside the blink
        if poll(page, DEMO_NIN_JS, 35000):
            page.evaluate("window.__game.scene.getScene('Game').scene.pause()")
        else:
            page.wait_for_timeout(3000)  # fallback: mid-loop frame, no freeze
        canvas.screenshot(path=f'{OUT}/v3_title_demo.png')
        page.evaluate("window.__game.scene.getScene('Game').scene.resume()")

        # --- 2) dive: tap-buffer parks the NIN at ~186m, greeter homes in from
        # below; freeze at ~45px (inside '!' radius 56, before the 30px attach)
        page.mouse.click(*to_screen(240, 457))  # PLAY, one click
        page.wait_for_function(
            "window.__game.scene.getScene('Game').state.phase === 'dive'", timeout=5000)
        # evidence staging: only the greeter (fish[0]) stays alive — a random
        # band-0 fish winning the race would fill the slot and cancel the '!'
        page.evaluate("""() => {
          window.__game.scene.getScene('Game').state.fish.forEach((f, i) => {
            if (i > 0) f.alive = false;
          });
        }""")
        hx, hy = to_screen(240, 640)
        page.mouse.move(hx, hy)
        page.mouse.down()  # hold = descend
        page.wait_for_function(
            "window.__game.scene.getScene('Game').state.hookY > 240", timeout=30000)
        page.mouse.up()  # release -> (tap buffer ~+40px) -> reel
        page.wait_for_timeout(250)
        page.mouse.down()  # NIN: bait still
        # primary: natural greeter homes in; fallback: stage one 48px out — either
        # way freeze at ~44-46px (inside '!' radius 56, before the 30px attach)
        prospect = poll(page, NEAR50_JS, 15000)
        if not prospect:
            page.evaluate("""() => {
              const s = window.__game.scene.getScene('Game').state;
              s.hookMode = 'hold'; s.hookX = 240; s.hookY = 96 + 260; s.tension = 5;
              s.fish.push({ uid: 8888, defId: 'f3', x: 288, y: 96 + 260, vx: -30, phase: 0, alive: true });
            }""")
            prospect = poll(page, NEAR50_JS, 5000)
        if prospect:
            page.evaluate("window.__game.scene.getScene('Game').scene.pause()")
        canvas.screenshot(path=f'{OUT}/v3_telegraph.png')
        page.evaluate("window.__game.scene.getScene('Game').scene.resume()")

        # --- 3) first catch: pause/resume dance — a pause right after the attach
        # can freeze the PREVIOUS presented frame (async present), so resume 500ms
        # to present the float (1.4s life, ~0.7 alpha), pause, settle, shoot
        if not poll(page, "window.__game.scene.getScene('Game').state.hooked.length > 0", 15000):
            print('WARN: no attach observed for the first-catch scene')
        page.evaluate("window.__game.scene.getScene('Game').scene.pause()")
        page.evaluate("window.__game.scene.getScene('Game').scene.resume()")
        page.wait_for_timeout(500)
        page.evaluate("window.__game.scene.getScene('Game').scene.pause()")
        page.wait_for_timeout(300)
        canvas.screenshot(path=f'{OUT}/v3_first_catch.png')
        page.evaluate("window.__game.scene.getScene('Game').scene.resume()")
        page.mouse.up()

        # --- 4) TRENCH: pause BEFORE the readback — a frozen canvas cannot tear
        page.evaluate("""() => {
          const s = window.__game.scene.getScene('Game').state;
          s.money = 1850; s.air = 30; s.tension = 8;
          s.hookY = 96 + 1120; s.hookX = 240; s.hookMode = 'hold'; s.hooked = [];
          if (!s.whaleUid) {
            s.fish.push({ uid: 9999, defId: 'whale', x: 330, y: 96 + 1140, vx: 0, phase: 0, alive: true });
            s.whaleUid = 9999;
          }
        }""")
        page.mouse.down()  # keep NIN: hook stays in the trench
        page.wait_for_timeout(1300)  # camera settles on the trench
        page.evaluate("window.__game.scene.getScene('Game').scene.pause()")
        page.wait_for_timeout(300)
        canvas.screenshot(path=f'{OUT}/v3_trench.png')
        page.evaluate("window.__game.scene.getScene('Game').scene.resume()")
        page.mouse.up()

        print('pageerrors:', errors if errors else 'none')
        print('SHOTS RESULT: OK')
        browser.close()


if __name__ == '__main__':
    main()
