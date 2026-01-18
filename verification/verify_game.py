import asyncio
from playwright.async_api import async_playwright, expect

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the game (Vite default port)
        await page.goto("http://localhost:5173")

        # Wait for game canvas to load
        await expect(page.locator("#gameCanvas")).to_be_visible()

        # Take screenshot of initial state (should show Start Screen)
        await page.screenshot(path="verification/start_screen.png")

        # Click Start
        await page.locator("#startBtnOverlay").click()

        # Wait a bit for game to start
        await page.wait_for_timeout(1000)

        # Verify Pause Button is visible
        await expect(page.locator("#pauseBtn")).to_be_visible()

        # Pause the game
        await page.keyboard.press("P")
        await page.wait_for_timeout(500)

        # Screenshot paused state (should see Glassmorphism overlay)
        await page.screenshot(path="verification/paused_state.png")

        # Resume
        await page.keyboard.press("P")
        await page.wait_for_timeout(500)

        # Screenshot gameplay
        await page.screenshot(path="verification/gameplay.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
