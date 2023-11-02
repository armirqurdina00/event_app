import { chromium } from 'playwright';
import { scrapeFbEvent } from 'facebook-event-scraper';
import { EventData } from 'facebook-event-scraper/dist/types';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import IFacebookScraper from './IFacebookScraper'; // Import the interface

const HEADLESS = true;

export default class FacebookScraper implements IFacebookScraper {
  public async fetchEventUrlsFromSearchUrl(url: string) {
    try{
      const browser = await chromium.launch({ headless: HEADLESS });
      const context = await browser.newContext({
        locale: 'en-GB',
        timezoneId: 'Europe/London',
      });
      var page = await (context as any).newPage();

      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      // Scroll down a few times
      const numberOfScrolls = 10;
      for (let i = 0; i < numberOfScrolls; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        // Wait for a bit for content to potentially load.
        await page.waitForTimeout(1000);
      }

      const content = <string>await page.content();

      const regex = /href="\/events\/(\d+)(\/?\?[a-zA-Z0-9%=&{}[\]:"\-_]*)?"/g;

      const matchingLinksRaw = content.match(regex) || [];

      const decodedLinks = matchingLinksRaw.map(link => {
        const decoded = link.replace('href="', 'https://www.facebook.com').replace('"', '');
        return this.normalizeUrl(decoded);
      });

      const uniqueLinks = decodedLinks ? [...new Set(decodedLinks)] : [];

      if (browser) await browser.close();

      return uniqueLinks;
    } catch (err){
      await page.screenshot({ path: __dirname + `/${uuidv4()}.png` });
      console.error(`Error in fetchEventUrlsFromOrganizerUrl with url: ${url}`);
      throw err;
    }
  }

  public async fetchEventUrlsFromOrganizerUrl(url: string): Promise<string[]> {
    try{
      const browser = await chromium.launch({ headless: HEADLESS });
      const context = await browser.newContext({
        locale: 'en-GB',
        timezoneId: 'Europe/London',
      });
      var page = await (context as any).newPage();

      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      try {
        await expect(page.getByLabel('Close')).toBeVisible({ timeout: 2000 });
      } catch(err) {
        console.info(`No close button found for ${url}. Typically this means that the page is private.`);
        return [];
      }

      await page.getByLabel('Close').click();

      // Scroll down a few times
      const numberOfScrolls = 10;
      for (let i = 0; i < numberOfScrolls; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        // Wait for a bit for content to potentially load.
        await page.waitForTimeout(1000);
      }

      const content = <string>await page.content();

      const regex = /https:\/\/www\.facebook\.com\/events\/\d+/g;
      const matchingLinks = content.match(regex);
      const normalizedUrls = matchingLinks ? matchingLinks.map(url => this.normalizeUrl(url)) : null;

      const uniqueLinks = normalizedUrls ? [...new Set(normalizedUrls)] : [];

      if (browser) await browser.close();

      return uniqueLinks;
    } catch (err){
      await page.screenshot({ path: __dirname + `/${uuidv4()}.png` });
      console.error(`Error in fetchEventUrlsFromOrganizerUrl with url: ${url}`);
      throw err;
    }
  }

  public async fetchOrganizerUrlFromEvent(url: string) {
    try {
      const browser = await chromium.launch({ headless: HEADLESS });
      const context = await browser.newContext({
        locale: 'en-GB',
        timezoneId: 'Europe/London',
      });
      var page = await (context as any).newPage();

      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      const href = await page.$eval('strong > a[role="link"]', link => link.getAttribute('href'), { timeout: 2000 });

      if (browser) await browser.close();

      return href;
    } catch (err){
      await page.screenshot({ path: __dirname + `/${uuidv4()}.png` });
      console.error(`Error in fetchOrganizerUrlFromEvent with url: ${url}`);
      throw err;
    }
  }

  public async fetchRepeatingEventURLsFromEvent(url: string) {
    try {
      const browser = await chromium.launch({ headless: HEADLESS });
      const context = await browser.newContext({
        locale: 'en-GB',
        timezoneId: 'Europe/London',
      });
      var page = await (context as any).newPage();

      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      try {
        await expect(page.locator('[aria-label^="+"]')).toBeVisible({ timeout: 1000 });
      } catch(error) {
        console.info(`No repeating events found for ${url}.`);
        return [];
      }

      await page.locator('[aria-label^="+"]').click();

      await expect(page.locator('span').filter({ hasText: /^Event dates/ }).first()).toBeVisible({ timeout: 2000 });

      const content = <string>await page.content();

      const regex = /href="\/events\/(\d+)(\/?\?[a-zA-Z0-9%=&{}[\]:"\-_]*)?"/g;

      const matchingLinksRaw = content.match(regex) || [];

      const decodedLinks = matchingLinksRaw.map(link => {
        const decoded = link.replace('href="', 'https://www.facebook.com').replace('"', '');
        return this.normalizeUrl(decoded);
      });

      const uniqueLinks = decodedLinks ? [...new Set(decodedLinks)] : [];

      if (browser) await browser.close();

      console.info(`Found ${uniqueLinks.length} repeating events for ${url}.`);

      return uniqueLinks;
    } catch (err){
      await page.screenshot({ path: __dirname + `/${uuidv4()}.png` });
      console.error(`Error in fetchRepeatingEventURLsFromEvent with url: ${url}`);
      throw err;
    }
  }

  public async fetchEventData(url: string): Promise<EventData> {
    try{
      const eventData = await scrapeFbEvent(url);

      // add props due to but in library
      const browser = await chromium.launch({ headless: HEADLESS });
      const context = await browser.newContext({
        locale: 'en-GB',
        timezoneId: 'Europe/London',
      });
      var page = await (context as any).newPage();

      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      const element = await page.waitForSelector('[data-imgperflogname="profileCoverPhoto"]', { timeout: 2000 });
      eventData.photo.imageUri = await element.getAttribute('src');
      eventData.usersInterested = await this.extractNumberOfResponded(page);

      if (browser) await browser.close();

      return eventData;
    } catch (err){
      await page.screenshot({ path: __dirname + `/${uuidv4()}.png` });
      console.error(`Error in fetchEventData with url: ${url}`);
      throw err;
    }
  }

  // utils

  private async extractNumberOfResponded(page): Promise<number | null> {
  // Extract all text from the body of the page
    const allText = await page.$eval('body', (el) => el.textContent);

    // Use regular expression to find pattern like "151 people responded" or "3.2K people responded"
    const regex = /([\d.]+K?) people responded/;
    const match = allText.match(regex);

    // Convert the matched number (e.g., "3.2K") to an actual numeric value
    if (match) {
      const numberPart = match[1];
      if (numberPart.endsWith('K')) {
        return parseFloat(numberPart) * 1000;
      }
      return parseInt(numberPart, 10);
    }

    // Return null if not found
    return null;
  }

  private normalizeUrl(url: string): string {
    const urlObj = new URL(url);

    // Remove query parameters
    urlObj.search = '';

    // Remove 'www.'
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }

    // Remove any trailing slash
    const normalizedUrl = urlObj.toString().replace(/\/$/, '');

    return normalizedUrl;
  }
}

