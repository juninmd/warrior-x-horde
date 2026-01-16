from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 480, 'height': 800})

        # Navigate
        page.goto("http://localhost:5173")

        # Click start
        page.click("#startBtnOverlay")
        time.sleep(1)

        # Check if Shop Button exists
        shop_btn = page.get_by_text("🛒 Shop")
        if shop_btn.is_visible():
            print("Shop button found.")
            shop_btn.click()
            time.sleep(0.5)

            # Check if Shop Container opens
            shop_container = page.locator("#shopContainer")
            if shop_container.is_visible():
                print("Shop container opened.")

                # Check for items
                items = page.locator(".shop-item")
                count = items.count()
                print(f"Found {count} shop items.")

                if count > 0:
                    print("Shop seems populated.")
                else:
                    print("ERROR: Shop empty.")
            else:
                print("ERROR: Shop container did not open.")
        else:
            print("ERROR: Shop button not found.")

        browser.close()

if __name__ == "__main__":
    run()
