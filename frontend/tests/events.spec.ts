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
	await page.getByRole('button', { name: 'Jetzt anmelden' }).click()

	// First Login
	await page.getByLabel('Email Adresse').fill(process.env.TEST_ACCOUNT_EMAIL)
	await page.getByLabel('Email Adresse').click()
	await page.getByLabel('Passwort').fill(process.env.TEST_ACCOUNT_PW)
	await page.getByRole('button', { name: 'Weiter', exact: true }).click()

	// temporary fix due to unknown bug
	await page.waitForURL(
		/.*\/events\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
	)
	await page.getByTestId('add-group-or-event').click()

	// Continue adding Event
	await page.locator('input[name="event-title"]').fill('Test Title 1')
	await page.click('input[name="event-location"]')
	await page.keyboard.type('Karlsruhe')
	await page.getByText('KarlsruheGermany').click()
	await new Promise((res) => setTimeout(res, 1000)) // wait for place_changed event
	await page
		.getByTestId('input-test-id')
		.setInputFiles(__dirname + '/../public/images/icon-512.png')
	await page.waitForLoadState('networkidle') // temporary fix due to unknown bug
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForURL(
		/.*\/events\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
	)

	// Edit Event
	await page.getByTestId('edit-test-id').first().click()
	await page.locator('input[name="event-title"]').fill('Test Title 2')
	await page.click('input[name="event-location"]')
	await page.getByText('KarlsruheGermany').click() // bug fix, otherwise submit button is not clicked for real.
	await new Promise((res) => setTimeout(res, 1000)) // wait for place_changed event
	await page.getByTestId('submit').click()

	await page.waitForURL(
		/.*\/events\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
	)

	// Delete Event
	await page.getByTestId('edit-test-id').first().click()
	await page.getByTestId('delete').click()
	await page.getByTestId('delete-confirmation').click()
})
