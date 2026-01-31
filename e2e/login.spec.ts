/**
 * E2E Tests - Login Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for splash screen to finish
        await page.waitForTimeout(3000);
    });

    test('should display login form', async ({ page }) => {
        // Check login form elements are visible
        await expect(page.getByPlaceholder(/enter username/i)).toBeVisible();
        await expect(page.getByPlaceholder(/enter password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should show error on invalid credentials', async ({ page }) => {
        await page.getByPlaceholder(/enter username/i).fill('invalid@test.com');
        await page.getByPlaceholder(/enter password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /sign in/i }).click();

        // Wait for error message
        await expect(page.getByText(/invalid|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should toggle between login and registration', async ({ page }) => {
        // Click create account link
        await page.getByText(/create.*account|sign up|register/i).click();

        // Registration form should appear
        await expect(page.getByPlaceholder(/first name/i)).toBeVisible();
        await expect(page.getByPlaceholder(/last name/i)).toBeVisible();
        await expect(page.getByPlaceholder(/email/i).first()).toBeVisible();
    });

    test('should validate email format in registration', async ({ page }) => {
        // Go to registration
        await page.getByText(/create.*account|sign up|register/i).click();

        // Fill with invalid email
        await page.getByPlaceholder(/first name/i).fill('Test');
        await page.getByPlaceholder(/last name/i).fill('User');
        await page.getByPlaceholder(/email/i).first().fill('invalidemail');
        await page.getByPlaceholder(/password/i).first().fill('SecurePass123');
        await page.getByPlaceholder(/confirm/i).fill('SecurePass123');

        // Submit
        await page.getByRole('button', { name: /create|register|sign up/i }).click();

        // Should show validation error
        await expect(page.getByText(/invalid.*email|email.*format/i)).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('login form should be keyboard navigable', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(3000);

        // Tab through form elements
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Username field should get focus
        const usernameField = page.getByPlaceholder(/enter username/i);
        await expect(usernameField).toBeFocused();

        // Type and tab to password
        await page.keyboard.type('test@example.com');
        await page.keyboard.press('Tab');

        // Password field should get focus
        const passwordField = page.getByPlaceholder(/enter password/i);
        await expect(passwordField).toBeFocused();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(3000);

        // Check for h1 or main heading
        const headings = await page.locator('h1, h2').count();
        expect(headings).toBeGreaterThan(0);
    });
});

test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('login form should be usable on mobile', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(3000);

        // Form should be visible and not overflow
        const form = page.locator('form');
        await expect(form.first()).toBeVisible();

        // Inputs should be usable
        await page.getByPlaceholder(/enter username/i).fill('mobile@test.com');
        await page.getByPlaceholder(/enter password/i).fill('password123');
    });
});
