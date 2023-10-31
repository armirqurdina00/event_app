import { test } from '@playwright/test'
import { writeFileSync, readFileSync } from 'fs'

const telegramURL = 'https://web.telegram.org/a/'
const authFilePath = 'playwright/.auth/userAuth.json'
const inviteURLFilePath = 'telegramInviteURLs.json'
const isUsingStoredLoginData = false
const inviteURLs = {}

const groupNames = [
	'Karlsruhe',
	'Freiburg',
	'Heidelberg',
	'Stuttgart',
	'Pforzheim',
	'Offenburg',
	'Mannheim',
	'Konstanz',
	'Basel',
	'Munich',
	'Nuremberg',
	'Augsburg',
	'Ulm',
	'Heilbronn',
	'Darmstadt',
	'Cologne',
	'Regensburg',
	'Salzburg',
	'Zurich',
	'Frankfurt',
	'Hamburg',
	'Lucerne',
	'Berlin',
	'Innsbruck',
	'Kassel',
	'Marburg',
	'Lausanne',
	'Amsterdam',
	'Linz',
	'Essen',
	'Dortmund',
	'Dusseldorf',
	'Bremen',
	'Duisburg',
	'Leipzig',
	'Dresden',
	'Bochum',
	'Wuppertal',
	'Bielefeld',
	'Bonn',
	'Munster',
	'Wiesbaden',
	'Saarbrucken',
	'Monchengladbach',
	'Aachen',
	'Braunschweig',
	'Krefeld',
	'Mainz',
	'Lubeck',
	'Oberhausen',
	'Halle',
	'Istanbul',
	'Moscow',
	'London',
	'Saint Petersburg',
	'Madrid',
	'Kyiv',
	'Rome',
	'Paris',
	'Bucharest',
	'Vienna',
	'Budapest',
	'Warsaw',
	'Barcelona',
	'Prague',
	'Basel',
	'Milan',
	'Sofia',
	'Brussels',
	'Stockholm',
	'Palma',
	'Rovinj',
	'Kiel',
	'Erfurt',
	'Magdeburg',
	'Karlsruhe • Tanzpartner',
	'Freiburg • Tanzpartner',
	'Heidelberg • Tanzpartner',
	'Stuttgart • Tanzpartner',
	'Pforzheim • Tanzpartner',
	'Offenburg • Tanzpartner',
	'Mannheim • Tanzpartner',
	'Augsburg • Tanzpartner',
	'Paris • Dance Partner', // Not German
	'Saarbrucken • Tanzpartner',
	'Konstanz • Tanzpartner',
	'Munich • Tanzpartner',
	'Nuremberg • Tanzpartner',
	'Ulm • Tanzpartner',
	'Heilbronn • Tanzpartner',
	'Darmstadt • Tanzpartner',
	'Cologne • Tanzpartner',
	'Regensburg • Tanzpartner',
	'Frankfurt • Tanzpartner',
	'Hamburg • Tanzpartner',
	'Berlin • Tanzpartner',
	'Kassel • Tanzpartner',
	'Marburg • Tanzpartner',
	'Essen • Tanzpartner',
	'Dortmund • Tanzpartner',
	'Dusseldorf • Tanzpartner',
	'Bremen • Tanzpartner',
	'Duisburg • Tanzpartner',
	'Leipzig • Tanzpartner',
	'Dresden • Tanzpartner',
	'Bochum • Tanzpartner',
	'Wuppertal • Tanzpartner',
	'Bielefeld • Tanzpartner',
	'Bonn • Tanzpartner',
	'Munster • Tanzpartner',
	'Wiesbaden • Tanzpartner',
	'Monchengladbach • Tanzpartner',
	'Aachen • Tanzpartner',
	'Braunschweig • Tanzpartner',
	'Krefeld • Tanzpartner',
	'Mainz • Tanzpartner',
	'Lubeck • Tanzpartner',
	'Oberhausen • Tanzpartner',
	'Halle • Tanzpartner',
	'Istanbul • Dance Partner', // Not German
	'Moscow • Dance Partner', // Not German
	'London • Dance Partner', // Not German
	'Saint Petersburg • Dance Partner', // Not German
	'Madrid • Dance Partner', // Not German
	'Kyiv • Dance Partner', // Not German
	'Rome • Dance Partner', // Not German
	'Bucharest • Dance Partner', // Not German
	'Vienna • Tanzpartner',
	'Budapest • Dance Partner', // Not German
	'Warsaw • Dance Partner', // Not German
	'Barcelona • Dance Partner', // Not German
	'Prague • Dance Partner', // Not German
	'Basel • Tanzpartner',
	'Milan • Dance Partner', // Not German
	'Sofia • Dance Partner', // Not German
	'Brussels • Dance Partner', // Not German
	'Stockholm • Dance Partner', // Not German
	'Palma • Dance Partner', // Not German
	'Rovinj • Dance Partner', // Not German
	'Kiel • Tanzpartner',
	'Erfurt • Tanzpartner',
	'Magdeburg • Tanzpartner'
]

const existingInviteURLs = readExistingInviteURLs() // Read existing URLs

test.skip('create telegram groups and save invite URLs', async ({ browser }) => {
	try {
		const navigationPage = await setupNavigationPage(browser)

		for (const groupName of groupNames) {
			if (!existingInviteURLs[groupName]) {
				// Check if groupName already exists in existing URLs
				await createAndRetrieveURL(navigationPage, groupName)
			}
		}
	} catch (err) {
		throw err
	}
})

async function setupNavigationPage(browser) {
	let page = await browser.newPage()

	if (!isUsingStoredLoginData) {
		await page.goto(telegramURL)
		await page.waitForSelector('button[title="New Message"]')
		await page.context().storageState({ path: authFilePath })
	}
	await page.close()

	const context = await browser.newContext({ storageState: authFilePath })
	const navigationPage = await context.newPage()
	await navigationPage.goto(telegramURL)
	await navigationPage.waitForSelector('button[title="New Message"]')
	return navigationPage
}

async function createAndRetrieveURL(navigationPage, groupName) {
	const completeGroupName = `${groupName} • sabaki.dance`
	await createNewGroup(navigationPage, completeGroupName)
	const telegramInviteURL = await retrieveInviteURL(navigationPage)
	inviteURLs[groupName] = telegramInviteURL // Store the URL in the object
	writeFileSync(inviteURLFilePath, JSON.stringify({ ...existingInviteURLs, ...inviteURLs }, null, 4))
	console.log(`Extracted Telegram Invite URL for ${completeGroupName}:`, telegramInviteURL)
}

async function createNewGroup(page, groupName) {
	await page.click('button[title="New Message"]')
	await page.click('div[role="menuitem"]:has-text("New Group")')
	await page.click('button[aria-label="Continue To Group Info"]')
	await page.fill('input[aria-label="Group name"]', groupName)
	await page.click('button[aria-label="Create Group"]')
	await page.click(`.ListItem-button:has-text("${groupName}")`)
	await page.click('button[aria-label="More actions"]')
	await page.click('div[role="menuitem"]:has-text("Edit")')
	await page.click('div.ListItem-button:has-text("Invite Links")')
	await page.getByRole('button', { name: 'Create a New Link' }).click()
	await page.getByLabel('Create Link').click()
}

async function retrieveInviteURL(page) {
	const selector = 'span.title.invite-title'
	await page.waitForSelector(selector)
	const element = await page.$(selector)
	if (element) {
		return await element.textContent()
	} else {
		throw new Error('Telegram Invite URL not found')
	}
}

function readExistingInviteURLs() {
	let existingInviteURLs = {}
	try {
		// Try reading the existing URLs from the file if it exists
		existingInviteURLs = JSON.parse(readFileSync(inviteURLFilePath, 'utf-8'))
	} catch (err) {
		console.warn(`Could not read ${inviteURLFilePath}. Will create new file.`)
	}
	return existingInviteURLs
}
