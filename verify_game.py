from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # Launch with mobile emulation context
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 667},
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()

        print("Navigating to game...")
        page.goto("http://localhost:5173")

        # Wait for start button
        try:
            print("Waiting for start button...")
            start_btn = page.locator("#startBtnOverlay")
            start_btn.wait_for(state="visible", timeout=10000)

            # Click start
            print("Clicking start...")
            start_btn.click() # or .tap()

            # Wait for game to initialize (countdown 3s + buffer)
            print("Waiting for countdown...")
            time.sleep(4)

            # Simulate Joystick Drag to Max
            # Input logic: touchstart starts joystick at touch location
            # touchmove moves joystick relative to start

            print("Simulating joystick drag...")
            center_x = 187
            center_y = 333

            # Mouse methods simulate touch in mobile context
            page.mouse.move(center_x, center_y)
            page.mouse.down() # touchstart
            # Move 100px to right (max radius ~50-80)
            page.mouse.move(center_x + 100, center_y, steps=10) # touchmove

            # Take screenshot while holding down
            print("Taking screenshot...")
            page.screenshot(path="verification.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
