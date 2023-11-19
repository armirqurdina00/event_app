import { Browser, Page, chromium } from 'playwright';
import { scrapeFbEvent } from 'facebook-event-scraper';
import { EventData } from 'facebook-event-scraper/dist/types';
import { expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import IFacebookScraper from './IFacebookScraper'; // Import the interface

const HEADLESS = true;

// todo: stop process when fb blocks us
export default class FacebookScraper implements IFacebookScraper {
  public async fetchEventUrlsFromSearchUrl(url: string) {
    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page: Page = await (context as any).newPage();

    try {
      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      const numberOfScrolls = 10;
      for (let i = 0; i < numberOfScrolls; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
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

      return uniqueLinks;
    } catch (err: unknown) {
      console.error(`Error when processing url '${url}'.`);
      await this.takeScreenshot(page, url);
      throw err;
    } finally {
      if (browser) await browser?.close();
    }
  }

  public async fetchEventUrlsFromOrganizerUrl(url: string): Promise<string[]> {
    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page: Page = await (context as any).newPage();

    try {
      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      try {
        await expect(page.getByLabel('Close')).toBeVisible({ timeout: 2000 });
      } catch (err) {
        console.info(`No close button found for ${url}. Typically this means that the page is private.`);
        throw err;
      }

      await page.getByLabel('Close').click();

      // Scroll down a few times
      const numberOfScrolls = 5;
      for (let i = 0; i < numberOfScrolls; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        // Wait for a bit for content to potentially load.
        await page.waitForTimeout(1000);

        // Click all "See more" buttons
        const buttonSelector = 'div[role="button"]:has-text("See more")';

        while (true) {
          try {
            await page.waitForSelector(buttonSelector, {
              state: 'visible',
              timeout: 500,
            });
            await page.click(buttonSelector);
          } catch (err) {
            break;
          }
        }
      }

      const content = <string>await page.content();

      const regex = /https:\/\/www\.facebook\.com\/events\/\d+/g;
      const matchingLinks = content.match(regex);
      const normalizedUrls = matchingLinks ? matchingLinks.map(url => this.normalizeUrl(url)) : null;

      const uniqueLinks = normalizedUrls ? [...new Set(normalizedUrls)] : [];

      if (browser) await browser.close();

      return uniqueLinks;
    } catch (err: unknown) {
      console.error(`Error when processing url '${url}'.`);
      await this.takeScreenshot(page, url);
      throw err;
    } finally {
      if (browser) await browser?.close();
    }
  }

  public async fetchOrganizerUrlFromEvent(url: string) {
    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page: Page = await (context as any).newPage();

    try {
      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      /* todo:
        Consider implementing scrolling at this point. Occasionally, an error is thrown here:
        page.$eval: Error: failed to find element matching selector "strong > a[role="link"]"
        This could be due to the required element not being loaded yet, which scrolling might resolve.
      */

      const href = await page.$eval('strong > a[role="link"]', link => link.getAttribute('href'), { timeout: 2000 });

      if (!href) throw new Error(`No organizer URL found for ${url}.`);

      if (browser) await browser.close();

      return href;
    } catch (err: unknown) {
      console.error(`Error when processing url '${url}'.`);
      await this.takeScreenshot(page, url);
      throw err;
    } finally {
      if (browser) await browser?.close();
    }
  }

  public async fetchRepeatingEventURLsFromEvent(url: string) {
    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page: Page = await (context as any).newPage();

    try {
      await page.goto(url);

      await expect(page.getByRole('button', { name: 'Allow all cookies' })).toBeVisible({ timeout: 2000 });
      await page.getByRole('button', { name: 'Allow all cookies' }).click();

      try {
        await expect(page.locator('[aria-label^="+"]')).toBeVisible({
          timeout: 1000,
        });
      } catch (err) {
        console.info(`No repeating events found for ${url}.`);
        throw err;
      }

      await page.locator('[aria-label^="+"]').click();

      await expect(
        page
          .locator('span')
          .filter({ hasText: /^Event dates/ })
          .first()
      ).toBeVisible({ timeout: 2000 });

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
    } catch (err: unknown) {
      console.error(`Error when processing url '${url}'.`);
      await this.takeScreenshot(page, url);
      throw err;
    } finally {
      if (browser) await browser?.close();
    }
  }

  public async fetchEventData(url: string): Promise<EventData> {
    let eventData: EventData | null = null;
    const browser: Browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      locale: 'en-GB',
      timezoneId: 'Europe/London',
    });
    const page: Page = await (context as any).newPage();

    eventData = await scrapeFbEvent(url);

    try {
      await page.goto(url);
      await this.allowCookies(page);

      // Extract additional information using selectors and add to the eventData
      const coverPhotoElement = await page.waitForSelector('[data-imgperflogname="profileCoverPhoto"]', {
        timeout: 2000,
      });
      if (eventData.photo === null) {
        eventData.photo = {
          imageUri: '',
          url: '',
          id: '',
        };
      }
      eventData.photo.imageUri = (await coverPhotoElement.getAttribute('src')) ?? undefined;
      eventData.usersInterested = await this.extractNumberOfResponded(page);
    } catch (err: unknown) {
      console.error(`Error when processing url '${url}'.`);
      await this.takeScreenshot(page, url);
      throw err;
    } finally {
      if (browser) await browser?.close();
    }

    return eventData;
  }

  // utils

  private async allowCookies(page: Page) {
    const acceptCookiesButton = await page.getByRole('button', {
      name: 'Allow all cookies',
    });
    await acceptCookiesButton.click({ timeout: 2000 });
  }

  private async takeScreenshot(page: Page | null, url: string) {
    try {
      if (page) {
        const screenshotPath = `${__dirname}/${uuidv4()}.png`;
        await page.screenshot({ path: screenshotPath });
        console.error(`Screenshot taken: ${screenshotPath}`);
      } else {
        console.error(`Page not available to take screenshot for URL: ${url}`);
      }
    } catch (errScreenshot) {
      console.error('Error taking screenshot:', errScreenshot);
    }
  }

  private extractErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return (err as { message: string }).message;
    }
    return 'Unknown error occurred.';
  }

  private async extractNumberOfResponded(page): Promise<number> {
    // Extract all text from the body of the page
    const allText = await page.$eval('body', el => el.textContent);

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

    return 0;
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
