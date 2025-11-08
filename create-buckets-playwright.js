const { chromium } = require('playwright');

async function createStorageBucketsWithPlaywright() {
  console.log('🚀 Starting Playwright automation to create Supabase storage buckets...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser so user can see what's happening
    slowMo: 500 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    const projectUrl = 'https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets';
    
    console.log(' navigated to Supabase Storage page...');
    await page.goto(projectUrl, { waitUntil: 'networkidle' });
    
    // Wait a bit for page to fully load
    await page.waitForTimeout(3000);
    
    // Check if we're on login page or need authentication
    const currentUrl = page.url();
    if (currentUrl.includes('sign-in') || currentUrl.includes('login') || await page.$('text=/sign in|log in/i')) {
      console.log('⚠️  Please log in to Supabase in the browser window.');
      console.log('   Waiting for you to complete login...\n');
      
      // Wait until URL changes or we see the storage page
      await page.waitForURL(/.*storage.*/, { timeout: 120000 });
      console.log('✅ Login detected, continuing...\n');
    }
    
    // Look for "New Bucket" or "Create Bucket" button
    console.log('🔍 Looking for bucket creation button...');
    
    // Try multiple selectors for the create button
    const createButtonSelectors = [
      'button:has-text("New Bucket")',
      'button:has-text("Create Bucket")',
      'button:has-text("Add Bucket")',
      '[data-testid*="create"]',
      'button[aria-label*="bucket"]',
      'a:has-text("New Bucket")'
    ];
    
    let createButton = null;
    for (const selector of createButtonSelectors) {
      try {
        createButton = await page.$(selector);
        if (createButton) {
          console.log(`✅ Found create button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!createButton) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'storage-page-debug.png' });
      console.log('❌ Could not find create bucket button.');
      console.log('   Screenshot saved to storage-page-debug.png');
      console.log('   Please create buckets manually or check the page structure.');
      return;
    }
    
    // Create avatars bucket
    console.log('\n📦 Creating "avatars" bucket...');
    await createButton.click();
    await page.waitForTimeout(2000);
    
    // Fill bucket name
    const nameSelectors = [
      'input[name="name"]',
      'input[placeholder*="name" i]',
      'input[placeholder*="bucket" i]',
      'input[type="text"]'
    ];
    
    let nameInput = null;
    for (const selector of nameSelectors) {
      try {
        nameInput = await page.$(selector);
        if (nameInput && await nameInput.isVisible()) {
          await nameInput.fill('avatars');
          console.log('   ✓ Filled bucket name');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!nameInput) {
      console.log('   ⚠️  Could not find name input, you may need to type "avatars" manually');
    }
    
    // Check public checkbox for avatars
    await page.waitForTimeout(1000);
    const publicCheckboxSelectors = [
      'input[type="checkbox"][name*="public" i]',
      'input[type="checkbox"][aria-label*="public" i]',
      'label:has-text("Public") input[type="checkbox"]'
    ];
    
    for (const selector of publicCheckboxSelectors) {
      try {
        const checkbox = await page.$(selector);
        if (checkbox && await checkbox.isVisible()) {
          const isChecked = await checkbox.isChecked();
          if (!isChecked) {
            await checkbox.check();
            console.log('   ✓ Set bucket to public');
          }
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Submit/create the bucket
    const submitSelectors = [
      'button:has-text("Create")',
      'button:has-text("Save")',
      'button[type="submit"]',
      'button:has-text("Add")'
    ];
    
    for (const selector of submitSelectors) {
      try {
        const submitBtn = await page.$(selector);
        if (submitBtn && await submitBtn.isVisible()) {
          await submitBtn.click();
          console.log('   ✓ Clicked create button');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Wait for bucket to be created
    await page.waitForTimeout(3000);
    console.log('   ✅ Avatars bucket created!\n');
    
    // Create gallery bucket
    console.log('📦 Creating "gallery" bucket...');
    
    // Find create button again
    createButton = null;
    for (const selector of createButtonSelectors) {
      try {
        createButton = await page.$(selector);
        if (createButton && await createButton.isVisible()) {
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (createButton) {
      await createButton.click();
      await page.waitForTimeout(2000);
      
      // Fill bucket name
      nameInput = null;
      for (const selector of nameSelectors) {
        try {
          nameInput = await page.$(selector);
          if (nameInput && await nameInput.isVisible()) {
            await nameInput.fill('gallery');
            console.log('   ✓ Filled bucket name');
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Gallery should be private, so don't check public checkbox
      // (it should be unchecked by default)
      
      // Submit/create
      for (const selector of submitSelectors) {
        try {
          const submitBtn = await page.$(selector);
          if (submitBtn && await submitBtn.isVisible()) {
            await submitBtn.click();
            console.log('   ✓ Clicked create button');
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      await page.waitForTimeout(3000);
      console.log('   ✅ Gallery bucket created!\n');
    }
    
    console.log('🎉 All storage buckets created successfully!');
    console.log('   - avatars (public)');
    console.log('   - gallery (private)');
    
    // Keep browser open for 5 seconds so user can verify
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error during automation:', error.message);
    console.log('\n📝 Fallback: Please create buckets manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets');
    console.log('2. Click "New Bucket"');
    console.log('3. Create "avatars" bucket (Public: ON)');
    console.log('4. Create "gallery" bucket (Public: OFF)');
    
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: 'error-screenshot.png' });
      console.log('   Screenshot saved to error-screenshot.png');
    } catch (e) {
      // Ignore screenshot errors
    }
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  createStorageBucketsWithPlaywright().catch(console.error);
}

module.exports = { createStorageBucketsWithPlaywright };

