const { chromium } = require('playwright');

async function createStorageBuckets() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Supabase dashboard...');
    
    // Navigate to Supabase project storage page
    // URL format: https://supabase.com/dashboard/project/{project-ref}/storage/buckets
    const projectUrl = 'https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets';
    
    await page.goto(projectUrl, { waitUntil: 'networkidle' });
    
    console.log('Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Check if we need to log in
    const loginButton = await page.$('text=/sign in|log in/i');
    if (loginButton) {
      console.log('Please log in to Supabase dashboard in the browser window that opened.');
      console.log('After logging in, press Enter to continue...');
      
      // Wait for user to log in manually
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }
    
    // Create avatars bucket
    console.log('Creating avatars bucket...');
    const newBucketButton = await page.$('text=/new bucket|create bucket|add bucket/i');
    if (newBucketButton) {
      await newBucketButton.click();
      await page.waitForTimeout(1000);
      
      // Fill in bucket details
      await page.fill('input[name="name"], input[placeholder*="bucket"], input[placeholder*="name"]', 'avatars');
      
      // Check public checkbox if available
      const publicCheckbox = await page.$('input[type="checkbox"][name*="public"], input[type="checkbox"][aria-label*="public"]');
      if (publicCheckbox) {
        await publicCheckbox.check();
      }
      
      // Click create/save button
      const createButton = await page.$('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
      if (createButton) {
        await createButton.click();
        await page.waitForTimeout(2000);
      }
      
      console.log('✓ Avatars bucket created');
    }
    
    // Create gallery bucket
    console.log('Creating gallery bucket...');
    const newBucketButton2 = await page.$('text=/new bucket|create bucket|add bucket/i');
    if (newBucketButton2) {
      await newBucketButton2.click();
      await page.waitForTimeout(1000);
      
      await page.fill('input[name="name"], input[placeholder*="bucket"], input[placeholder*="name"]', 'gallery');
      
      // Gallery should be private, so don't check public
      
      const createButton2 = await page.$('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');
      if (createButton2) {
        await createButton2.click();
        await page.waitForTimeout(2000);
      }
      
      console.log('✓ Gallery bucket created');
    }
    
    console.log('Storage buckets creation complete!');
    
    // Keep browser open for a bit to verify
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error creating storage buckets:', error);
    console.log('\nPlease create the buckets manually:');
    console.log('1. Go to: https://supabase.com/dashboard/project/kbfvrmfcrimnomyaqzwd/storage/buckets');
    console.log('2. Create bucket "avatars" (public: true)');
    console.log('3. Create bucket "gallery" (public: false)');
  } finally {
    await browser.close();
  }
}

createStorageBuckets();

