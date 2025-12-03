from playwright.sync_api import sync_playwright, expect
import time

def verify_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Navigate to homepage
        print("Navigating to homepage...")
        try:
            page.goto("http://localhost:5173")
            page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"Navigation error: {e}")

        # Take debug screenshot
        page.screenshot(path="verification/debug_homepage.png")
        print("Debug screenshot taken.")

        # Click on "Projects" button
        print("Clicking Projects button...")
        # Try finding it loosely
        projects_btn = page.locator("button").filter(has_text="Projects")
        expect(projects_btn).to_be_visible()
        projects_btn.click()

        # Verify Projects sidebar is visible
        print("Verifying Projects view...")
        expect(page.get_by_text("Projects", exact=True).first).to_be_visible()

        # Create a new project
        print("Creating new project...")
        input_field = page.get_by_placeholder("New project name")
        input_field.fill("Test Project 123")

        add_btn = page.get_by_role("button", name="+")
        add_btn.click()

        # Verify project appears in list
        print("Verifying new project in list...")
        # Be more specific to avoid conflict with the header of the selected project
        project_item = page.locator(".overflow-y-auto").get_by_text("Test Project 123").first
        expect(project_item).to_be_visible()

        # Click the project to select it
        project_item.click()

        # Verify project details header
        print("Verifying project details...")
        expect(page.get_by_text("Test Project 123 Tasks")).to_be_visible()

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/dashboard_verified.png")

        browser.close()
        print("Verification complete!")

if __name__ == "__main__":
    verify_dashboard()
