import asyncio
from playwright.async_api import async_playwright
import sys
import os

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the game (assuming it's running on localhost:5173 from previous context)
        # If not, I might need to start it, but usually the environment has it running or I can use file:// but this is a vite app.
        # The prompt says "To start the development server, use `npm run dev`".
        # I will assume I need to start it if it's not running, but for the test script I'll assume it's running or I'll catch the error.
        # Actually, usually I should start the server in the background.
        # But for now I'll try to connect to localhost:5173.

        try:
            await page.goto("http://localhost:5173")
        except Exception as e:
            print(f"Failed to load page: {e}")
            sys.exit(1)

        # Listen for console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        # Wait for start button
        try:
            await page.wait_for_selector("#startBtnOverlay", timeout=5000)
            print("Start button found.")
        except Exception:
            print("Start button not found.")
            sys.exit(1)

        # Click start button
        await page.click("#startBtnOverlay")
        print("Clicked start button.")

        # Wait a bit for game loop to start
        await asyncio.sleep(1)

        # Check gameState.isStarted
        is_started = await page.evaluate("() => window.gameState ? window.gameState.isStarted : false")
        # Note: window.gameState might not be exposed.
        # Looking at game.ts, it doesn't seem to expose gameState to window explicitly except maybe via debug functions if I added them?
        # Wait, I don't see gameState exposed to window in game.ts.
        # However, I can check if the canvas is being drawn to or if the start screen is hidden.

        start_screen_class = await page.eval_on_selector("#startScreen", "el => el.className")
        print(f"Start screen class: {start_screen_class}")

        if "active" in start_screen_class:
            print("Game did not start (start screen still active).")
            # If there are errors, print them
            if errors:
                print("Errors found:")
                for err in errors:
                    print(f"- {err}")
            sys.exit(1)

        # If start screen is not active, game should be running.
        # Check for errors again
        if errors:
            print("Errors found during execution:")
            for err in errors:
                print(f"- {err}")
            sys.exit(1)

        print("Game started successfully and no errors detected.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
