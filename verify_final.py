from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto(f"file://{os.getcwd()}/index.html")
    page.wait_for_timeout(500)

    # Screenshot Start Screen
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(500)

    # Open Settings
    page.click("#settingsBtn", force=True)
    page.wait_for_timeout(500)

    # Close Settings
    page.evaluate("""
        const closeBtns = document.querySelectorAll('.settings-close-btn');
        if (closeBtns.length > 0) {
            closeBtns[closeBtns.length - 1].click();
        }
    """)
    page.wait_for_timeout(500)

    # Start Game
    page.click("text=JOGAR AGORA", force=True)
    page.wait_for_timeout(5000)

    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        device = p.devices['Pixel 5']
        context = browser.new_context(
            **device,
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
