from playwright.sync_api import sync_playwright

def verify_game_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            # Wait for canvas
            page.wait_for_selector("#gameCanvas")
            # Click start
            page.click("#startBtnOverlay")
            page.wait_for_timeout(2000) # Wait for game to run

            # Check for Shop UI
            shop = page.wait_for_selector("#shopContainer", state="visible", timeout=5000)
            if shop:
                print("Shop UI found")

            # Take screenshot
            page.screenshot(path="verification/game_verification.png")
            print("Screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_ui()
