from playwright.sync_api import sync_playwright

def verify_hud():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            page.wait_for_timeout(2000) # Wait for load

            # Check manifest link
            manifest = page.locator('link[rel="manifest"]')
            print(f"Manifest found: {manifest.count() > 0}")
            if manifest.count() > 0:
                print(f"Manifest href: {manifest.get_attribute('href')}")

            # Click start button if it exists
            start_btn = page.locator('#startBtnOverlay')
            if start_btn.is_visible():
                start_btn.click()
                page.wait_for_timeout(1000)

            # Wait for game loop to render UI
            page.wait_for_timeout(2000)

            # Take screenshot
            page.screenshot(path="verification/hud_screenshot.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_hud()
