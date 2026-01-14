from playwright.sync_api import Page, expect, sync_playwright
import time

def test_game_start(page: Page):
    # 1. Arrange: Go to the game URL.
    print("Navigating to game...")
    page.goto("http://localhost:5173")

    # 2. Act: Wait for start screen and click Play
    print("Waiting for start button...")
    start_btn = page.locator("#startBtnOverlay")
    expect(start_btn).to_be_visible(timeout=10000)

    # Take screenshot of start screen
    page.screenshot(path="verification/start_screen.png")
    print("Start screen screenshot taken.")

    print("Clicking start...")
    start_btn.click()

    # 3. Assert: Game canvas is visible and overlay is gone
    print("Waiting for game to start...")
    # The overlay has class 'glass-overlay active', when hidden 'glass-overlay' (without active)
    # Actually checking if it is hidden is better
    overlay = page.locator("#startScreen")
    expect(overlay).not_to_have_class("glass-overlay active", timeout=5000)

    # Wait a bit for gameplay (entities to spawn and move)
    print("Watching gameplay for 3 seconds...")
    time.sleep(3)

    # 4. Screenshot: Capture gameplay
    page.screenshot(path="verification/gameplay.png")
    print("Gameplay screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to mobile size to test responsive design
        page.set_viewport_size({"width": 390, "height": 844})
        try:
            test_game_start(page)
            print("Test passed!")
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
