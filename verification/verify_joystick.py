from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to match game design
        context = browser.new_context(viewport={'width': 480, 'height': 800})
        page = context.new_page()

        # Navigate to game
        page.goto("http://localhost:5173")

        # Wait for start button
        page.wait_for_selector("#startBtnOverlay")

        # Click start
        page.click("#startBtnOverlay")

        # Wait for game to initialize
        time.sleep(2)

        # Simulate touch drag to activate joystick
        # Start at center-ish
        start_x = 240
        start_y = 600

        # Touch down
        page.mouse.move(start_x, start_y)
        page.mouse.down()

        # Drag
        page.mouse.move(start_x + 50, start_y - 50)

        # Take screenshot while dragging (joystick should be visible)
        page.screenshot(path="verification/joystick_visible.png")

        # Release
        page.mouse.up()

        browser.close()

if __name__ == "__main__":
    run()
