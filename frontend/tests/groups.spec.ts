import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
import { dataSource } from './DataSource';
dotenv.config({ path: './.env.local' });

test('test groups', async ({ page }) => {
  await dataSource.initialize();
  await dataSource.query('DELETE FROM group_join_e;');
  await dataSource.query('DELETE FROM group_e;');
  await dataSource.query('DELETE FROM location_e;');

  await page.goto(
    `${process.env.TEST_URL}/groups` +
      '?latitude=49.006889&longitude=8.403653&distance=50&city=Karlsruhe&orderBy=chronological&selectedItem=chronological'
  );

  await new Promise((res) => setTimeout(res, 1000));

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

  await new Promise((res) => setTimeout(res, 1000));

  await page.getByTestId('add-group-or-event').click();

  // Continue adding Group
  await page.getByLabel('Titel').fill('Test Title 1');
  await page.getByLabel('Beschreibung').fill('Test Description 1');
  await page.getByLabel('Link').fill('https://chat.whatsapp.com/');
  await page.click('input[name="group-location"]');
  await page.keyboard.type('Karlsruh', { delay: 100 });
  await expect(page.getByText('KarlsruheGermany')).toBeVisible({
    timeout: 2000,
  });
  await page.getByText('KarlsruheGermany').click();
  await new Promise((res) => setTimeout(res, 1000));
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
  await expect(page.getByText('KarlsruheGermany').nth(1)).toBeVisible({
    timeout: 5000,
  });
  await page.getByText('KarlsruheGermany').nth(1).click();
  await new Promise((res) => setTimeout(res, 1000));
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
