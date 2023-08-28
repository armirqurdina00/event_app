import { test, expect } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: './.env.local' })

test('test', async ({ page }) => {
	// Go to Page
	await page.goto(`${process.env.TEST_URL}/groups`)

	// Accept cookies
	await page.getByRole('button', { name: 'Akzeptieren' }).click()

	// Add Group
	await page.getByLabel('add').click()

	// First Login
	await page.getByLabel('Email address').fill(process.env.TEST_ACCOUNT_EMAIL)
	await page.getByLabel('Email address').click()
	await page.getByLabel('Password').fill(process.env.TEST_ACCOUNT_PW)
	await page.getByRole('button', { name: 'Continue', exact: true }).click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.goto(`${process.env.TEST_URL}/groups/new`) // temporary fix due to unknown bug

	// Continue adding Group
	await page.locator('input[name="group-title"]').fill('Test Title 1')
	await page.locator('input[name="group-description"]').fill('Test Description 1')
	await page.locator('input[name="group-link"]').fill('https://testlink1.de')
	await page.locator('input[name="group-link"]').fill('https://magnus-goedde.de')
	await page.getByTestId('submit').click()

	// temporary fix due to unknown bug
	await page.waitForLoadState('networkidle')
	await page.reload()

	// Edit Group
	await find_group_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.locator('input[name="group-title"]').fill('Test Title 2')
	await page.locator('input[name="group-description"]').fill('Test Description 2')
	await page.locator('input[name="group-link"]').fill('https://testlink2.de')
	await page.getByTestId('submit').click()

	// Delete Group
	await find_group_and_click_edit(page)
	await page.getByTestId('edit-test-id').click()
	await page.getByTestId('delete').click()
})

async function find_group_and_click_edit(page) {
	let i = 1
	let editIconVisible = false

	do {
		await page.locator(`div:nth-child(${i}) > .relative`).click()
		await page.waitForTimeout(1000) // Adjust the timeout as needed
		const editIcon = await page.$('[data-testid="edit-test-id"]')
		if (editIcon) {
			editIconVisible = await editIcon.isVisible()
		}
		i++
	} while (!editIconVisible)
}
// await page.locator('div:nth-child(3) > .relative > div > div:nth-child(2) > .flex > svg:nth-child(3)').click();
