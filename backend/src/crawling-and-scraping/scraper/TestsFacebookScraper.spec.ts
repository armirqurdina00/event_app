import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import { expect } from 'chai';
import FacebookScraper from './FacebookScraper';
import TestData from './TestData';

describe('FacebookScraper.', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  describe('Tests for FacebookScraper.', function () {
    before(async function () {
      this.Scraper = new FacebookScraper();
    });

    it('Should fetch at least one URL from event search in Karlsruhe.', async function () {
      const eventURLsFromSearch = await this.Scraper.fetchEventUrlsFromSearchUrl(TestData.SEARCH_URL);

      expect(eventURLsFromSearch.length).greaterThanOrEqual(1);

      eventURLsFromSearch.forEach(eventURL => {
        expect(eventURL).to.match(/^https:\/\/facebook\.com\/events\/\d+\/?$/);
      });
    });

    it('Should fetch event URLs from organizer HavannaTempel', async function () {
      const eventURLs = await this.Scraper.fetchEventUrlsFromOrganizerUrl(TestData.ORG_URL);

      eventURLs.forEach(eventURL => {
        expect(eventURL).to.match(/^https:\/\/facebook\.com\/events\/\d+$/);
      });

      let eventFound = false;
      for (const eventURL of eventURLs) {
        const eventData = await this.Scraper.fetchEventData(eventURL);
        if (!eventData) continue;
        const description = eventData.description.toLowerCase();
        if (
          description.includes('sensual thursday') ||
          description.includes('salsa azucar') ||
          description.includes('salsa sabor')
        ) {
          eventFound = true;
          break;
        }
      }

      expect(eventFound).to.be.true;
    });

    it('Should fetch organizer URL from event and match test data', async function () {
      const eventURLs = await this.Scraper.fetchEventUrlsFromOrganizerUrl(TestData.ORG_URL);
      const orgUrl = await this.Scraper.fetchOrganizerUrlFromEvent(eventURLs[0]);

      expect(orgUrl).to.equal(TestData.ORG_URL);
    });

    it('Should fetch other event URLs from repeating event', async function () {
      const eventURLs = await this.Scraper.fetchRepeatingEventURLsFromEvent(TestData.REPEATING_EVENT_URL);
      expect(eventURLs.length).to.greaterThan(1);
    });
  });

  describe.skip('Debug FacebookScraper.', function () {
    before(async function () {
      this.Scraper = new FacebookScraper();
    });

    it('Debug.', async function () {
      const eventData = await this.Scraper.fetchEventData('https://facebook.com/events/849494386869513');
      console.log('eventData', eventData);

      // const orgUrl = await this.Scraper.fetchOrganizerUrlFromEvent(
      //   'https://www.facebook.com/events/854598766461006'
      // );
      // console.log('orgUrl', orgUrl);

      // const event_url1 = 'https://www.facebook.com/events/313338057705499/';
      // const eventData1 = await this.Scraper.fetchRepeatingEventURLsFromEvent(event_url1);
      // console.log('eventData1', eventData1);

      // const event_url2 = 'https://www.facebook.com/events/565562635417838';
      // const eventData2 = await this.Scraper.fetchRepeatingEventURLsFromEvent(event_url2);
      // console.log('eventData2', eventData2);

      // const events = await this.Scraper.fetchEventUrlsFromOrganizerUrl('https://www.facebook.com/new.step.14');
      // console.log('events', events);
    });
  });
});
