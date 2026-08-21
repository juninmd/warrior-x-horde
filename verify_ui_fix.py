from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        device = p.devices['Pixel 5']
        context = browser.new_context(**device)
        page = context.new_page()

        page.goto(f"file://{os.getcwd()}/index.html")
        page.wait_for_load_state("networkidle")

        page.click("#settingsBtn", force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="verify_screenshots/settings_fix.png")

        browser.close()

if __name__ == "__main__":
    run()
