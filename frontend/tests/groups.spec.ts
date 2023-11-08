import { test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

test('test groups', async ({ page }) => {
  // Go to Page
  await page.goto(`${process.env.TEST_URL}/groups`);

  // Accept cookies
  await page.getByRole('button', { name: 'Akzeptieren' }).click();

  // Add Group
  await page.getByTestId('add-group-or-event').click();
  await page.getByRole('button', { name: 'Jetzt anmelden' }).click();

  // First Login
  await page.getByLabel('Email Adresse').fill(process.env.TEST_ACCOUNT_EMAIL);
  await page.getByLabel('Email Adresse').click();
  await page.getByLabel('Passwort').fill(process.env.TEST_ACCOUNT_PW);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();

  // temporary fix due to unknown bug
  await page.waitForURL(
    /.*\/events\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
  );
  await page.goto(`${process.env.TEST_URL}/groups`);
  await page.getByTestId('add-group-or-event').click();

  // Continue adding Group
  await page.getByLabel('Titel').fill('Test Title 1');
  await page.getByLabel('Beschreibung').fill('Test Description 1');
  await page.getByLabel('Link').fill('https://chat.whatsapp.com/');
  await page.click('input[name="group-location"]');
  await page.keyboard.type('Karlsruhe');
  await page.getByText('KarlsruheGermany').click();
  await new Promise((res) => setTimeout(res, 1000)); // wait for place_changed event
  await page.getByTestId('submit').click();

  await page.waitForURL(
    /.*\/groups\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
  );

  // Edit Group
  await page.getByTestId('edit-test-id').first().click();
  await page.getByLabel('Titel').fill('Test Title 2');
  await page.getByLabel('Beschreibung').fill('Test Description 2');
  await page.getByLabel('Link').fill('https://chat.whatsapp.com/');
  await page.click('input[name="group-location"]');
  await page.getByText('KarlsruheGermany').click(); // bug fix, otherwise submit button is not clicked for real.
  await new Promise((res) => setTimeout(res, 1000)); // wait for place_changed event
  await page.getByTestId('submit').click();

  await page.waitForURL(
    /.*\/groups\?latitude=[^&]+&longitude=[^&]+&distance=[^&]+&city=[^&]+&orderBy=[^&]+&selectedItem=[^&]+$/
  );

  await page.getByTestId('join-button-id').first().click();
  await page.getByTestId('confirm-whatsapp-test-id').click();
  await page.waitForURL(/https:\/\/chat.whatsapp.com.*/);

  // Delete Group
  await page.goto(`${process.env.TEST_URL}/groups`);
  await page.getByTestId('edit-test-id').first().click();
  await page.getByTestId('delete').click();
  await page.getByTestId('delete-confirmation').click();
});
