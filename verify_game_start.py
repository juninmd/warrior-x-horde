from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for start button
    page.wait_for_selector("#startBtnOverlay")

    # Take screenshot of start
    page.screenshot(path="verification_start.png")

    # Click start
    page.click("#startBtnOverlay")

    # Wait a bit for game loop
    time.sleep(2)

    # Take screenshot of gameplay
    page.screenshot(path="verification_gameplay.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
