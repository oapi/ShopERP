from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Wait for the login form
    page.wait_for_selector("form#login-form")

    # Fill login form
    page.locator("#login-username").fill("admin")
    page.locator("#login-password").fill("admin123")

    # Submit login
    page.locator("form#login-form button[type='submit']").click()

    # Wait for the dashboard to load (login overlay is hidden)
    page.wait_for_selector('#login-backdrop', state='hidden')

    # Take a screenshot to verify login succeeded
    page.screenshot(path="screenshot.png")

    browser.close()
