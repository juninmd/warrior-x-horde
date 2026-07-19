from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)

        # Emulate Mobile Device (Pixel 5) to verify responsive UI
        device = p.devices['Pixel 5']
        context = browser.new_context(**device)
        page = context.new_page()

        # Load local index.html directly
        page.goto(f"file://{os.getcwd()}/index.html")
        page.wait_for_load_state("networkidle")

        # 1. Screenshot Start Screen (Leaderboard + Install Btn)
        page.screenshot(path="verify_screenshots/1_start_screen.png")
        print("Captured Start Screen")

        # 2. Open Settings
        # Use force=True because overlay might be partially obstructing or animating
        # Try both the ID and the class just in case of specific element selection issues
        page.click("#settingsBtn", force=True)

        # Wait specifically for the active class which indicates it is shown
        try:
            page.wait_for_selector(".settings-modal.active", state="visible", timeout=5000)
        except:
            pass

        page.wait_for_timeout(500) # Wait for animation/render
        page.screenshot(path="verify_screenshots/2_settings_modal.png")
        print("Captured Settings Modal")

        # 3. Close Settings
        # Since it dynamically appends to document body, try different selector approach
        page.evaluate("""
            const closeBtns = document.querySelectorAll('.settings-close-btn');
            if (closeBtns.length > 0) {
                closeBtns[closeBtns.length - 1].click();
            }
        """)
        page.wait_for_timeout(500)

        # 4. Start Game (Click Start Button overlay)
        if page.is_visible("text=JOGAR AGORA"):
            page.click("text=JOGAR AGORA", force=True)

            # Wait for game to start (countdown overlay might appear)
            page.wait_for_timeout(5000) # Wait for countdown "3, 2, 1, GO!"

            # Wait a little longer for UI to fade and game to fully start before pausing
            page.wait_for_timeout(1000)

            # 5. Pause Game
            page.click("#pauseBtnTop", force=True)
            try:
                page.wait_for_selector(".pause-modal", state="attached", timeout=5000)
                page.wait_for_timeout(1000)
                page.screenshot(path="verify_screenshots/3_pause_modal.png")
                print("Captured Pause Modal")
            except Exception as e:
                print(f"Failed to capture Pause Modal: {e}")
        else:
            print("Start button not visible, skipping gameplay verification")

        browser.close()

if __name__ == "__main__":
    run()
