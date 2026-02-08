
from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate
        page.goto("http://localhost:3000")

        # Inject LocalStorage Data for Leaderboard
        page.evaluate("""() => {
            const data = [
                { score: 5000, date: Date.now() },
                { score: 3000, date: Date.now() },
                { score: 1000, date: Date.now() }
            ];
            localStorage.setItem('crowdLeaderboard', JSON.stringify(data));
        }""")

        # Reload to pick up localstorage (game initializes on load)
        page.reload()

        # Wait for game to load
        page.wait_for_selector("#startScreen")

        # Give JS a moment to render the leaderboard
        time.sleep(1)

        # 1. Verify Start Screen Leaderboard
        try:
            leaderboard = page.wait_for_selector("#startScreenLeaderboard", timeout=5000)
            print("Leaderboard found.")
            page.screenshot(path="verification/start_screen.png")
        except Exception as e:
            print(f"Leaderboard NOT found: {e}")
            # Screenshot anyway for debugging
            page.screenshot(path="verification/start_screen_failed.png")

        # 2. Click Start
        page.click("#startBtnOverlay")

        # Wait for HUD
        time.sleep(2)

        # Screenshot of HUD
        page.screenshot(path="verification/hud.png")

        browser.close()

if __name__ == "__main__":
    verify_ui()
