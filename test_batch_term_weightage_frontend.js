const { chromium } = require('playwright');

async function testBatchTermWeightageManagement() {
  console.log('🧪 Testing Batch-Term Weightage Management Frontend...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:8081');
    
    // Wait for the page to load
    await page.waitForTimeout(2000);
    
    // Check if we need to login
    const loginButton = await page.locator('button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      console.log('🔐 Logging in as admin...');
      
      // Fill login form
      await page.fill('input[name="username"], input[placeholder*="username"], input[type="text"]', 'adminuser');
      await page.fill('input[name="password"], input[placeholder*="password"], input[type="password"]', 'admin123');
      
      // Click login
      await loginButton.click();
      
      // Wait for login to complete
      await page.waitForTimeout(3000);
    }
    
    // Navigate to Batch-Term Weightages page
    console.log('🎯 Navigating to Batch-Term Weightages...');
    
    // Try to find the menu item in sidebar
    const sidebarToggle = await page.locator('button[aria-label*="toggle"], button[aria-label*="menu"]').first();
    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for the Batch-Term Weightages menu item
    const weightageMenuItem = await page.locator('text="Batch-Term Weightages"').first();
    if (await weightageMenuItem.isVisible()) {
      await weightageMenuItem.click();
      console.log('✅ Successfully navigated to Batch-Term Weightages page');
    } else {
      // Try direct navigation
      await page.goto('http://localhost:8081/admin/batch-term-weightages');
      console.log('🔄 Direct navigation to weightages page');
    }
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check if the page loaded correctly
    const pageTitle = await page.locator('h1:has-text("Batch-Term Weightage Management")').first();
    if (await pageTitle.isVisible()) {
      console.log('✅ Batch-Term Weightage Management page loaded successfully');
      
      // Check for key components
      const refreshButton = await page.locator('button:has-text("Refresh")').first();
      const newConfigButton = await page.locator('button:has-text("New Configuration")').first();
      const configurationsTab = await page.locator('text="Configurations"').first();
      
      console.log('🔍 Checking page components:');
      console.log('  - Refresh button:', await refreshButton.isVisible() ? '✅' : '❌');
      console.log('  - New Configuration button:', await newConfigButton.isVisible() ? '✅' : '❌');
      console.log('  - Configurations tab:', await configurationsTab.isVisible() ? '✅' : '❌');
      
      // Try to click refresh to test API connectivity
      if (await refreshButton.isVisible()) {
        console.log('🔄 Testing API connectivity...');
        await refreshButton.click();
        await page.waitForTimeout(2000);
        
        // Check for any error messages
        const errorToast = await page.locator('[data-sonner-toast][data-type="error"]').first();
        if (await errorToast.isVisible()) {
          const errorText = await errorToast.textContent();
          console.log('❌ API Error:', errorText);
        } else {
          console.log('✅ API connectivity working');
        }
      }
      
      // Check if configurations table is visible
      const configurationsTable = await page.locator('table').first();
      if (await configurationsTable.isVisible()) {
        console.log('✅ Configurations table is visible');
        
        // Count rows in the table
        const rows = await page.locator('table tbody tr').count();
        console.log(`📊 Found ${rows} configuration(s) in the table`);
      }
      
      console.log('🎉 Frontend test completed successfully!');
      
    } else {
      console.log('❌ Failed to load Batch-Term Weightage Management page');
      
      // Check for any error messages on the page
      const errorMessages = await page.locator('[role="alert"], .error, .alert-error').all();
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log('❌ Error found:', text);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testBatchTermWeightageManagement().catch(console.error);
