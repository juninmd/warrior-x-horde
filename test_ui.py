from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173/")

        # Take a screenshot
        page.screenshot(path="screenshot.png")
        print("Done")
        browser.close()

if __name__ == "__main__":
    run()
