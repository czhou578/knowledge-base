from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto("https://claude.ai")

    input("Log in and open the page, then press Enter...")

    links = page.eval_on_selector_all(
        "a",
        "elements => elements.map(e => ({text: e.innerText, url: e.href}))"
    )

    print(links)