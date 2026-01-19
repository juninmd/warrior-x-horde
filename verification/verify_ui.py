
from playwright.sync_api import sync_playwright

def verify_game_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5173")

        # Wait for canvas to be present
        page.wait_for_selector("#gameCanvas")

        # Click start button overlay
        page.click("#startBtnOverlay")

        # Wait a bit for game to start and UI to render
        page.wait_for_timeout(2000)

        # Take screenshot
        page.screenshot(path="verification/game_ui.png")
        browser.close()

if __name__ == "__main__":
    verify_game_ui()
