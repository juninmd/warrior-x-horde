from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console logs
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: console_errors.append(str(err)))

        try:
            # Navigate to game
            page.goto("http://localhost:5173")

            # Wait for start button (check if UI loads)
            page.wait_for_selector("#startBtnOverlay", timeout=5000)
            print("Start button found.")

            # Click start
            page.click("#startBtnOverlay")
            print("Start button clicked.")

            # Wait a bit for game loop to run
            time.sleep(3)

            # Check for canvas
            canvas = page.query_selector("#gameCanvas")
            if canvas:
                print("Canvas found.")
            else:
                print("Canvas NOT found.")

        except Exception as e:
            print(f"Test Exception: {e}")

        # Report errors
        if console_errors:
            print("\nConsole Errors Found:")
            for err in console_errors:
                print(f"- {err}")
        else:
            print("\nNo console errors detected.")

        browser.close()

if __name__ == "__main__":
    run()
