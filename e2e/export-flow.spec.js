import { test, expect } from '@playwright/test';

test.describe('Critical Export Flow: PI -> EI', () => {
  // Assuming frontend runs on http://localhost:5000 in test environment
  const baseURL = 'http://localhost:5000';

  test('Complete happy path: Login, Create PI, Convert to EI, Assert locks', async ({ page }) => {
    // ✅ User logs in successfully
    await page.goto(`${baseURL}/login`);
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Ensure dashboard loads
    await expect(page).toHaveURL(/.*dashboard.*/);

    // ✅ Navigates to Proforma Invoices
    await page.click('text="Proforma Invoices"');
    await expect(page).toHaveURL(/.*proforma-invoices.*/);

    // ✅ Creates a new PI with at least one product line
    await page.click('text="Create New PI"');
    
    // Fill required fields (mock selectors, adapt to real app)
    await page.selectOption('select[name="client_id"]', { index: 1 });
    await page.fill('input[name="invoice_number"]', `PI-E2E-${Date.now()}`);
    await page.fill('input[name="date"]', '2023-10-10');
    
    // Add product line
    await page.click('text="Add Product"');
    await page.fill('input[name="product_lines.0.product_name"]', 'Test Tile');
    await page.fill('input[name="product_lines.0.quantity"]', '100');
    await page.fill('input[name="product_lines.0.unit_price"]', '10');
    
    // Save PI
    await page.click('button:has-text("Save")');

    // ✅ PI appears in the list with status "Open"
    // Wait for redirect to list
    await expect(page.locator('table')).toBeVisible();
    const row = page.locator('tr').filter({ hasText: 'PI-E2E' }).first();
    await expect(row.locator('text="Open"')).toBeVisible();

    // ✅ Clicks Convert → Export Invoice
    await row.locator('button', { hasText: 'Convert' }).click();
    await page.click('text="To Export Invoice"');

    // Fill Export Invoice form
    await page.fill('input[name="invoice_number"]', `EI-E2E-${Date.now()}`);
    await page.click('button:has-text("Save Export Invoice")');

    // ✅ PI status changes to "Converted" and shows lock indicator
    await page.goto(`${baseURL}/proforma-invoices`);
    await expect(page.locator('table')).toBeVisible();
    const lockedRow = page.locator('tr').filter({ hasText: 'PI-E2E' }).first();
    await expect(lockedRow.locator('text="Converted"')).toBeVisible();

    // ✅ New Export Invoice appears in Export Invoice list
    await page.goto(`${baseURL}/export-invoices`);
    await expect(page.locator('table')).toBeVisible();
    const eiRow = page.locator('tr').filter({ hasText: 'EI-E2E' }).first();
    await expect(eiRow).toBeVisible();

    // ✅ Attempting to convert the same PI again shows an error or disabled button
    await page.goto(`${baseURL}/proforma-invoices`);
    // Check if Convert button is disabled or missing
    const convertBtn = lockedRow.locator('button', { hasText: 'Convert' });
    if (await convertBtn.isVisible()) {
      await expect(convertBtn).toBeDisabled();
    }
  });
});
