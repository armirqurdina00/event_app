import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })

test('test groups', async ({ page }) => {
	// Go to Page
	await page.goto(`${process.env.TEST_URL}/groups`)

	// Accept cookies
	await page.getByRole('button', { name: 'Akzeptieren' }).click()

	// Add Group
	await page.getByTestId('add-group-or-event').click()

	// First Login
	await page.getByRole('button', { name: 'Weiter mit Facebook' }).click();
	await page.getByRole('button', { name: 'Allow all cookies' }).click();
	await page.getByPlaceholder('Email or phone number').fill(process.env.FACEBOOK_EMAIL);
	await page.getByPlaceholder('Password').fill(process.env.FACEBOOK_PW);
	await page.getByRole('button', { name: 'Log In' }).click();

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.goto(`${process.env.TEST_URL}/groups/new`) // temporary fix due to unknown bug

	// Continue adding Group
	await page.getByLabel('Titel').fill('Test Title 1')
	await page.getByLabel('Beschreibung').fill('Test Description 1')
	await page.getByLabel('Link').fill('https://testlink1.de')
	await page.locator('input[name="group-location"]').fill('Karlsruhe')
	await page.getByText('KarlsruheGermany').click()
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Edit Group
	await page.getByTestId('edit-test-id').first().click()
	await page.getByLabel('Titel').fill('Test Title 2')
	await page.getByLabel('Beschreibung').fill('Test Description 2')
	await page.getByLabel('Link').fill('https://testlink2.de')
	await page.getByTestId('submit').click()

	// Delete Group
	await page.getByTestId('edit-test-id').first().click()
	await page.getByTestId('delete').click()
	await page.getByTestId('delete-confirmation').click()
})