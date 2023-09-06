import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })

test('test events', async ({ page }) => {
	// Go to Page
	await page.goto(process.env.TEST_URL)

	// Accept cookies
	await page.getByRole('button', { name: 'Akzeptieren' }).click()

	// Add Event
	await page.getByTestId('add-group-or-event').click()

	// First Login
	await page.getByRole('button', { name: 'Weiter mit Facebook' }).click();
	await page.getByRole('button', { name: 'Allow all cookies' }).click();
	await page.getByPlaceholder('Email or phone number').fill(process.env.FACEBOOK_EMAIL);
	await page.getByPlaceholder('Password').fill(process.env.FACEBOOK_PW);
	await page.getByRole('button', { name: 'Log In' }).click();

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.goto(`${process.env.TEST_URL}/events/new`)

	// Continue adding Event
	await page.locator('input[name="event-title"]').fill('Test Title 1')
	await page.locator('input[name="event-location"]').fill('Karlsruhe')
	await page.getByText('KarlsruheGermany').click()
	await page.getByTestId('input-test-id').setInputFiles(__dirname + '/../public/images/icon-512.png')
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Edit Event
	await page.getByTestId('edit-test-id').first().click()
	await page.locator('input[name="event-title"]').fill('Test Title 2')
	await page.locator('input[name="event-location"]').fill('Karlsruhe')
	await page.getByText('KarlsruheGermany').click()
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Delete Event
	await page.getByTestId('edit-test-id').first().click()
	await page.getByTestId('delete').click()
	await page.getByTestId('delete-confirmation').click()
})

