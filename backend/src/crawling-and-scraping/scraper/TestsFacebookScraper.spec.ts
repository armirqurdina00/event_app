import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import { expect } from 'chai';
import FacebookScraper from './FacebookScraper';

const TEST_DATA = {
  ORG_URL: 'https://www.facebook.com/HavannaTempel',
  SEARCH_URL: 'https://www.facebook.com/events/search?q=latin%20Karlsruhe&filters=eyJmaWx0ZXJfZXZlbnRzX2RhdGVfcmFuZ2U6MCI6IntcIm5hbWVcIjpcImZpbHRlcl9ldmVudHNfZGF0ZVwiLFwiYXJnc1wiOlwiMjAyMy0xMC0xM34yMDIzLTEyLTEzXCJ9In0=',
  EVENT_URL: 'https://www.facebook.com/events/565562635417838/632043598769741',
  REPEATING_EVENT_URL: 'https://www.facebook.com/events/313338057705499/'
};

describe('Tests for FacebookScraper.', function() {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  before(async function() {
    this.Scraper = new FacebookScraper();
  });

  it('Should fetch at least one URL from event search in Karlsruhe.', async function() {
    const eventURLsFromSearch = await this.Scraper.fetchEventUrlsFromSearchUrl(TEST_DATA.SEARCH_URL);

    expect(eventURLsFromSearch.length).greaterThanOrEqual(1);

    eventURLsFromSearch.forEach(eventURL => {
      expect(eventURL).to.match(/^https:\/\/facebook\.com\/events\/\d+\/?$/);
    });
  });

  it('Should fetch event URLs from organizer HavannaTempel', async function() {
    const eventURLs = await this.Scraper.fetchEventUrlsFromOrganizerUrl(TEST_DATA.ORG_URL);

    eventURLs.forEach(eventURL => {
      expect(eventURL).to.match(/^https:\/\/facebook\.com\/events\/\d+$/);
    });

    let sensualThursdayEventFound = false;
    for (const eventURL of eventURLs) {
      const eventData = await this.Scraper.fetchEventData(eventURL);

      if (eventData.description.includes('sensual thursday') || eventData.description.includes('SALSASABOR')) {
        sensualThursdayEventFound = true;
        break;
      }
    }

    expect(sensualThursdayEventFound).to.be.true;
  });


  it('Should fetch organizer URL from event and match test data', async function() {
    const eventURLs = await this.Scraper.fetchEventUrlsFromOrganizerUrl(TEST_DATA.ORG_URL);
    const orgUrl = await this.Scraper.fetchOrganizerUrlFromEvent(eventURLs[0]);

    expect(orgUrl).to.equal(TEST_DATA.ORG_URL);
  });

  it('Should fetch other event URLs from repeating event', async function() {
    const eventURLs = await this.Scraper.fetchOtherEventURLsFromEvent(TEST_DATA.REPEATING_EVENT_URL);
    expect(eventURLs.length).to.greaterThan(1);
  });

  it.skip('Debug.', async function() {
    const eventData = await this.Scraper.fetchEventData(TEST_DATA.EVENT_URL);
    console.log('eventData', eventData);

    const orgUrl = await this.Scraper.fetchOrganizerUrlFromEvent(TEST_DATA.EVENT_URL);
    console.log('orgUrl', orgUrl);

    const event_url1 = 'https://www.facebook.com/events/313338057705499/';
    const eventData1 = await this.Scraper.fetchOtherEventURLsFromEvent(event_url1);
    console.log('eventData1', eventData1);


    const event_url2 = 'https://www.facebook.com/events/565562635417838';
    const eventData2 = await this.Scraper.fetchOtherEventURLsFromEvent(event_url2);
    console.log('eventData2', eventData2);

  });

});