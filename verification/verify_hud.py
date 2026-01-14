from playwright.sync_api import sync_playwright

def verify_hud(page):
    # Go to local server (Vite usually defaults to 5173, but we should check the log or wait)
    page.goto("http://localhost:5173")

    # Wait for canvas
    page.wait_for_selector("#gameCanvas")

    # Wait a bit for the game to render initial frame
    page.wait_for_timeout(2000)

    # Click start button if needed (the overlay has a start button)
    start_btn = page.locator("#startBtnOverlay")
    if start_btn.is_visible():
        start_btn.click()
        page.wait_for_timeout(1000)

    # Take screenshot of the HUD
    page.screenshot(path="verification/hud_screenshot.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 480, "height": 800}) # Mobile viewport
        try:
            verify_hud(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
