
from playwright.sync_api import sync_playwright
import time

def verify_mystery_boxes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:5173")

        # Wait for game to load
        page.wait_for_selector("canvas", state="visible")

        # Click "JOGAR AGORA" to start
        # Wait for overlay to be visible
        try:
             page.wait_for_selector("#startBtnOverlay", state="visible", timeout=2000)
             page.click("#startBtnOverlay")
             print("Clicked start overlay")
        except:
             print("Start overlay not found or not visible")
             # Try clicking center
             page.mouse.click(240, 400)

        time.sleep(1) # Wait for start animation

        # Inject code to spawn a mystery box immediately for verification
        page.evaluate("""
            if (window.debugSpawnMysteryBox) {
               window.debugSpawnMysteryBox();
            }
        """)

        # Wait a bit for render
        time.sleep(1)

        # Take screenshot
        page.screenshot(path="verification/mystery_box_visible.png")

        browser.close()

if __name__ == "__main__":
    verify_mystery_boxes()
