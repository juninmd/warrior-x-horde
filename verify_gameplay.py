from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173")

            # Wait for start button overlay
            start_btn = page.locator("#startBtnOverlay")
            start_btn.wait_for(state="visible", timeout=10000)
            print("Found start button.")

            # Click start
            start_btn.click()
            print("Clicked start.")

            # Wait for game loop to run a bit
            time.sleep(2)

            # Take screenshot
            screenshot_path = "/home/jules/verification/gameplay.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
