const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\main\\.gemini\\antigravity-ide\\brain\\ed050855-5a5d-4044-bcca-18fb21c4fbce';

async function capture() {
  console.log('Launching browser for Student Experience verification...');
  const browser = await chromium.launch({ headless: true });

  try {
    // ----------------------------------------------------
    // 1. Desktop Homepage
    // ----------------------------------------------------
    const desktopPage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    console.log('Navigating to Desktop Homepage (http://localhost:3000)...');
    await desktopPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    const desktopPath = path.join(ARTIFACTS_DIR, 'desktop_homepage.png');
    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    console.log('✓ Desktop homepage saved:', desktopPath);

    // ----------------------------------------------------
    // 2. Campus Switcher
    // ----------------------------------------------------
    console.log('Testing Campus Switcher dropdown...');
    // Click campus selector button
    const campusBtn = desktopPage.locator('button:has-text("Apex Institute of Technology")').first();
    await campusBtn.click();
    await desktopPage.waitForTimeout(500);

    const switcherPath = path.join(ARTIFACTS_DIR, 'campus_switcher.png');
    await desktopPage.screenshot({ path: switcherPath, fullPage: false });
    console.log('✓ Campus switcher saved:', switcherPath);

    // Close dropdown
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(300);

    // ----------------------------------------------------
    // 3. Search / Filter State
    // ----------------------------------------------------
    console.log('Testing Search and Category Filter...');
    const searchInput = desktopPage.locator('input[placeholder*="Search events, clubs, venues"]').first();
    await searchInput.fill('rust');
    await desktopPage.waitForTimeout(500);

    const searchPath = path.join(ARTIFACTS_DIR, 'search_filter_state.png');
    await desktopPage.screenshot({ path: searchPath, fullPage: false });
    console.log('✓ Search/filter state saved:', searchPath);

    // Clear search
    await searchInput.fill('');
    await desktopPage.waitForTimeout(300);

    // ----------------------------------------------------
    // 4. Calendar View
    // ----------------------------------------------------
    console.log('Testing Full Calendar View...');
    const calTab = desktopPage.locator('button:has-text("Full Calendar")').first();
    await calTab.click();
    await desktopPage.waitForTimeout(500);

    // Switch to Month view
    const monthViewBtn = desktopPage.locator('button:has-text("Month")').first();
    if (await monthViewBtn.isVisible()) {
      await monthViewBtn.click();
      await desktopPage.waitForTimeout(500);
    }

    const calPath = path.join(ARTIFACTS_DIR, 'calendar_view.png');
    await desktopPage.screenshot({ path: calPath, fullPage: false });
    console.log('✓ Calendar view saved:', calPath);

    // ----------------------------------------------------
    // 5. Event Detail Page
    // ----------------------------------------------------
    console.log('Navigating to Event Detail page...');
    await desktopPage.goto('http://localhost:3000/events/systems-programming-rust-study-jam', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    const detailPath = path.join(ARTIFACTS_DIR, 'event_detail.png');
    await desktopPage.screenshot({ path: detailPath, fullPage: false });
    console.log('✓ Event detail saved:', detailPath);

    await desktopPage.close();

    // ----------------------------------------------------
    // 6. Mobile Homepage (360px and 390px)
    // ----------------------------------------------------
    console.log('Testing Mobile Homepage at 390x844...');
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Check for horizontal overflow
    const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile Viewport: clientWidth=${clientWidth}, scrollWidth=${scrollWidth}`);
    if (scrollWidth > clientWidth) {
      console.warn(`WARNING: Horizontal overflow detected! scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`);
    } else {
      console.log('✓ No horizontal overflow at 390px!');
    }

    const mobilePath = path.join(ARTIFACTS_DIR, 'mobile_homepage.png');
    await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    console.log('✓ Mobile homepage saved:', mobilePath);

    // Test Mobile at 360px
    await mobilePage.setViewportSize({ width: 360, height: 740 });
    await mobilePage.waitForTimeout(300);
    const scrollWidth360 = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth360 = await mobilePage.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile Viewport 360px: clientWidth=${clientWidth360}, scrollWidth=${scrollWidth360}`);
    if (scrollWidth360 > clientWidth360) {
      console.warn(`WARNING: Horizontal overflow detected at 360px! scrollWidth (${scrollWidth360}) > clientWidth (${clientWidth360})`);
    } else {
      console.log('✓ Case 10 PASS: Mobile has no horizontal overflow at 360px!');
    }

    await mobilePage.close();
    console.log('\nAll verification screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
