from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_game_ui(page: Page):
    # 1. Arrange: Go to the game
    page.goto("http://localhost:5173/")

    # 2. Act: Click start
    # Ensure start button is visible
    start_btn = page.locator("#startBtnOverlay")
    expect(start_btn).to_be_visible()
    start_btn.click()

    # 3. Wait for game loop to render UI
    time.sleep(2) # Wait for animation/fade out

    # 4. Screenshot
    page.screenshot(path="verification/game_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport size to test responsive UI
        page = browser.new_page(viewport={"width": 375, "height": 812})
        try:
            verify_game_ui(page)
        finally:
            browser.close()
