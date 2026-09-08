# BUG-2 input verification (real browser, dev server on 127.0.0.1:5209).
# Checks: 1-tap PLAY -> diving <500ms; forced fuel-lose; 1-tap TRY AGAIN -> fresh dive;
# sonar tap fires via hud.sonarHit; holding never sticks after overlay taps.
# Run: python3 scripts/qa_input.py
import json
import time

from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:5209/'
GAME_W, GAME_H = 480, 854

STATE_JS = """() => {
  const sc = window.__game.scene.getScene('Game');
  const s = sc.state;
  return { phase: s.phase, diveCount: s.diveCount, money: Math.round(s.money),
           air: +s.air.toFixed(1), mode: s.hookMode, charges: s.sonarCharges,
           sonarTimer: s.sonarTimer, holding: sc.holding,
           lose: document.querySelector('[data-testid=screen-lose]')?.textContent };
}"""


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 420, 'height': 746}, device_scale_factor=1)
        errors: list[str] = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        # the testid container is display:none — wait for attachment, not visibility
        page.wait_for_selector('#qa-testids', state='attached')
        page.wait_for_function(
            "document.querySelector('[data-testid=screen-title]')?.textContent === '1'",
            timeout=20000,
        )
        box = page.locator('#game canvas').bounding_box()
        print('canvas box:', json.dumps(box))

        def to_screen(gx: float, gy: float) -> tuple[float, float]:
            return (box['x'] + gx / GAME_W * box['width'],
                    box['y'] + gy / GAME_H * box['height'])

        def wait_phase(target: str, timeout_ms: int) -> float | None:
            t0 = time.perf_counter()
            while (time.perf_counter() - t0) * 1000 < timeout_ms:
                if page.evaluate("window.__game?.scene?.getScene('Game')?.state?.phase") == target:
                    return (time.perf_counter() - t0) * 1000
                page.wait_for_timeout(5)
            return None

        # --- 1) PLAY: exactly one click --------------------------------------
        x, y = to_screen(240, 457)
        page.mouse.click(x, y)  # one press + one release, nothing else
        lat = wait_phase('dive', 500)
        st = page.evaluate(STATE_JS)
        print(f"PLAY     : {'FIRED' if lat is not None else 'DEAD'}"
              f" latency={lat:.0f}ms" if lat is not None else 'PLAY     : DEAD (>500ms)')
        print('   after :', json.dumps(st))
        assert lat is not None, 'PLAY did not enter dive within 500ms'
        assert st['diveCount'] == 1 and st['money'] == 450, 'dive 1 not PAID (fuel leak)'
        assert st['holding'] is False, 'PLAY tap left holding stuck true'

        # --- 2) hold to descend, then force fuel lose -------------------------
        hx, hy = to_screen(240, 640)
        page.mouse.move(hx, hy)  # park the pointer BEFORE pressing (down() has no coords)
        page.mouse.down()  # hold = descend
        page.wait_for_function(
            "window.__game.scene.getScene('Game').state.hookY > 400", timeout=15000)
        page.evaluate("""() => {
          const s = window.__game.scene.getScene('Game').state;
          s.money = 0; s.air = 0.5;   // force OUT OF FUEL on next surface
        }""")
        page.mouse.up()  # release -> reel home -> resolveSurface -> lose
        lat = wait_phase('lose', 20000)
        print(f"forced lose reached: {lat is not None} ({lat:.0f}ms)" if lat else 'forced lose FAILED')
        assert lat is not None, 'game never reached lose after money=0'
        st = page.evaluate(STATE_JS)
        print('   after :', json.dumps(st))
        assert st['lose'] == '1', 'lose overlay not visible'

        # --- 3) TRY AGAIN: exactly one click ----------------------------------
        x, y = to_screen(240, 557)
        page.mouse.click(x, y)
        lat = wait_phase('dive', 500)
        st = page.evaluate(STATE_JS)
        print(f"TRY AGAIN: {'FIRED' if lat is not None else 'DEAD'}"
              f" latency={lat:.0f}ms" if lat is not None else 'TRY AGAIN: DEAD (>500ms)')
        print('   after :', json.dumps(st))
        assert lat is not None, 'TRY AGAIN did not restart within 500ms'
        assert st['diveCount'] == 1 and st['money'] == 450, 'retry run is not a fresh PAID dive'
        assert st['lose'] == '0', 'lose overlay still visible after retry'

        # --- 4) sonar button via hud.sonarHit ---------------------------------
        page.evaluate("window.__game.scene.getScene('Game').state.sonarCharges = 2")
        sx, sy = to_screen(436, 782)
        page.mouse.click(sx, sy)  # one tap on the sonar button
        page.wait_for_timeout(120)
        st = page.evaluate(STATE_JS)
        print('SONAR    :', 'FIRED' if st['charges'] == 1 else 'DEAD', json.dumps(st))
        assert st['charges'] == 1 and st['sonarTimer'] > 0, 'sonar tap did not register'
        assert st['holding'] is False, 'sonar tap left holding stuck true'

        print('pageerrors:', errors if errors else 'none')
        print('QA-INPUT RESULT: ALL PASS')
        browser.close()


if __name__ == '__main__':
    main()
