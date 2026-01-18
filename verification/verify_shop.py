from playwright.sync_api import sync_playwright

def verify_shop(page):
    # Go to the local dev server
    page.goto("http://localhost:5173")

    # Start the game
    page.click("#startBtnOverlay")

    # Wait for the game to start and shop button to appear (it appears after a bit or is hidden)
    # The shop is always in the DOM but hidden. `updateShopUI` sets it to flex when game starts.
    # We might need to wait for `gameState.isStarted` to be true.

    # Wait for the shop container to be visible
    shop_container = page.locator("#shopContainer")
    shop_container.wait_for(state="visible", timeout=10000)

    # Check if the new Recharge button exists
    # It has content "🔋 RECARGA"
    recharge_btn = shop_container.locator("button", has_text="RECARGA")

    if recharge_btn.is_visible():
        print("Recharge button found!")
    else:
        print("Recharge button NOT found!")

    # Take a screenshot
    page.screenshot(path="verification/shop_verification.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify_shop(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
