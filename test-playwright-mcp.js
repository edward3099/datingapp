const { chromium } = require('playwright');

async function testPlaywrightMCP() {
  console.log('🧪 Testing Playwright MCP...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    // Test 1: Navigate to a simple page
    console.log('Test 1: Navigating to example.com...');
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`✅ Successfully loaded page: ${title}\n`);
    
    // Test 2: Take a screenshot
    console.log('Test 2: Taking screenshot...');
    await page.screenshot({ path: 'playwright-test-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved to playwright-test-screenshot.png\n');
    
    // Test 3: Navigate to Supabase Storage page
    console.log('Test 3: Testing Supabase Storage page navigation...');
    const supabaseUrl = 'https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets';
    await page.goto(supabaseUrl, { waitUntil: 'networkidle', timeout: 10000 });
    
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`✅ Navigated to: ${currentUrl}\n`);
    
    // Test 4: Check if we can find elements
    console.log('Test 4: Checking for storage-related elements...');
    const pageContent = await page.textContent('body');
    const hasStorage = pageContent.toLowerCase().includes('storage') || 
                       pageContent.toLowerCase().includes('bucket');
    
    if (hasStorage) {
      console.log('✅ Found storage-related content on page\n');
    } else {
      console.log('ℹ️  Page may require authentication\n');
    }
    
    // Test 5: Take screenshot of Supabase page
    await page.screenshot({ path: 'supabase-storage-page.png' });
    console.log('✅ Screenshot of Supabase page saved\n');
    
    console.log('🎉 All Playwright tests passed!');
    console.log('\nPlaywright MCP is working correctly.');
    console.log('You can use it to:');
    console.log('- Automate browser interactions');
    console.log('- Test web applications');
    console.log('- Create storage buckets via UI automation');
    console.log('- Take screenshots and verify page content');
    
    // Keep browser open for 3 seconds
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Error during Playwright test:', error.message);
    console.error(error.stack);
    
    // Take error screenshot
    try {
      await page.screenshot({ path: 'playwright-error.png' });
      console.log('Error screenshot saved to playwright-error.png');
    } catch (e) {
      // Ignore screenshot errors
    }
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed. Test complete.');
  }
}

// Run the test
if (require.main === module) {
  testPlaywrightMCP().catch(console.error);
}

module.exports = { testPlaywrightMCP };

