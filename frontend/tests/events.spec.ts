import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })

test('test', async ({ page }) => {
	// Go to Page
	await page.goto(process.env.TEST_URL)

    // Accept cookies
	await page.getByRole('button', { name: 'Akzeptieren' }).click()

	// Add Event
	await page.getByLabel('add').click()

	// First Login
	await page.getByRole('button', { name: 'Continue with Facebook' }).click()
	await page.getByRole('button', { name: 'Allow all cookies' }).click()
	await page.getByPlaceholder('Email or phone number').fill(process.env.FACEBOOK_EMAIL)
	await page.getByPlaceholder('Password').fill(process.env.FACEBOOK_PW)
	await page.getByRole('button', { name: 'Log In' }).click()

	// Continue adding Event
	await page.locator('input[name="event-title"]').fill('Test Title 1')
	await page.locator('input[name="event-location"]').fill('Test Location 1')
	await page.locator('input[name="event-link"]').fill('https://magnus-goedde.de')
	await page.getByLabel('', { exact: true }).click()
	await page.getByLabel('', { exact: true }).setInputFiles(__dirname + '/../public/images/icon-512.png')
	await page.getByRole('button', { name: 'Senden' }).click()

	// Edit Event
	await find_event_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.locator('input[name="event-title"]').fill('Test Title 2')
	await page.locator('input[name="event-location"]').fill('Test Location 2')
	await page.getByRole('button', { name: 'Speichern' }).click()

	// Delete Event
	await find_event_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.getByRole('button', { name: 'Löschen' }).click()
})

async function find_event_and_click_edit(page) {
	let i = 1
	let editIconVisible = false

	do {
		await page.locator(`div:nth-child(${i}) > .relative > .event-img-16-9`).click()
		await page.waitForTimeout(1000) // Adjust the timeout as needed
		const editIcon = await page.$('[data-testid="edit-test-id"]')
		if (editIcon) {
			editIconVisible = await editIcon.isVisible()
		}
		i++
	} while (!editIconVisible)
}
