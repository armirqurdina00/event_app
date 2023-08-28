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
	await page.getByLabel('Email address').fill(process.env.TEST_ACCOUNT_EMAIL)
	await page.getByLabel('Email address').click()
	await page.getByLabel('Password').fill(process.env.TEST_ACCOUNT_PW)
	await page.getByRole('button', { name: 'Continue', exact: true }).click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.goto(`${process.env.TEST_URL}/events/new`)

	// Continue adding Event
	await page.locator('input[name="event-title"]').fill('Test Title 1')
	await page.locator('input[name="event-location"]').fill('Test Location 1')
	await page.locator('input[name="event-link"]').fill('https://magnus-goedde.de')
	await page.getByTestId('event-picture').click()
	await page.getByTestId('input-test-id').setInputFiles(__dirname + '/../public/images/icon-512.png')
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Edit Event
	await find_event_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.locator('input[name="event-title"]').fill('Test Title 2')
	await page.locator('input[name="event-location"]').fill('Test Location 2')
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Delete Event
	await find_event_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.getByTestId('delete').click()
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
