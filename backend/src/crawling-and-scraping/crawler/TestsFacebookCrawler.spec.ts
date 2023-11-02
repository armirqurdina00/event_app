import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import { expect } from 'chai';
import { Database } from '../../helpers';
import { EventDownvoteE, EventE, EventUpvoteE, ScrapeUrlE } from '../../commons/typeorm_entities';
import { DummyFacebookScraperConfig, FacebookCrawlerConfig, ScrapeUrlManagerConfig, ScrapeUrlStatus, UrlType } from '../../commons/enums';
import FacebookCrawler from './FacebookCrawler';
import DummyFacebookScraper from '../scraper/DummyFacebookScraper';
import moment from 'moment';
import TimeManager from './TimeManager';
import { get_events as getEvents, get_event as getEvent } from '../../services/EventsService';
import ScrapeUrlManager from './ScrapeUrlManager';

describe('FacebookCrawler Functionality', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  describe('Scraping and Storing Results', function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    beforeEach(async function () {
      await clearDatabase();

      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90
      };
      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        MIN_SCRAPE_TIME_DIFF_IN_DAYS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
      };
      this.TimeManager = new TimeManager();
      this.Scraper = new DummyFacebookScraper();
      this.ScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
      this.ScrapeUrlManager = new ScrapeUrlManager(this.TimeManager, this.ScrapeUrlRepo, URL_MANAGER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper,this.ScrapeUrlManager, this.TimeManager, CRAWLER_CONFIG);
    });

    it('Should save events retrieved from search', async function () {
      const city = 'Karlsruhe';
      await this.Crawler.scrapeEventsViaSearch(city);
      const savedEvents = await getEvents(1, 100);
      expect(savedEvents.items.length).greaterThanOrEqual(1);
    });

    it('Should save events retrieved from organizer', async function () {
      const city = 'Karlsruhe';

      await this.Crawler.scrapeEventsViaSearch(city);
      const oldEvents = await getEvents(1, 100);

      await this.Crawler.scrapeEventsViaOrganizer(city);
      const newEvents = await getEvents(1, 100);

      expect(newEvents.items.length).greaterThan(oldEvents.items.length);
    });

    it('Should update events', async function () {
      const city = 'Karlsruhe';

      await this.Crawler.scrapeEventsViaSearch(city);

      const event = (await getEvents(1, 1)).items[0];

      await this.Crawler.updateEvents(city);

      const updatedEvent1 = await getEvent(event.event_id);

      expect(event).to.deep.equal(updatedEvent1);

      const now = this.TimeManager.getCurrentTime();
      const eventStart = moment(updatedEvent1.unix_time);
      const halfTimeToStart = moment(eventStart).subtract(moment(now).diff(eventStart) / 2, 'milliseconds');
      const threeDaysBeforeStart = moment(eventStart).subtract(3, 'days');
      const nextScrape = moment.min(halfTimeToStart, threeDaysBeforeStart);

      this.TimeManager.setCurrentTime(nextScrape.toDate());
      this.Scraper.updateSampleEventData({
        usersInterested: event.upvotes_sum + 1
      });

      await this.Crawler.updateEvents(city);

      const updatedEvent2 = await getEvent(event.event_id);

      expect(event).not.to.deep.equal(updatedEvent2);

      this.TimeManager.setCurrentTime(eventStart.toDate());

      await this.Crawler.updateEvents(city);

      const scrapeUrl = await getScrapeUrl(event.url);

      expect(scrapeUrl.scrapeUrlStatus).to.equal(ScrapeUrlStatus.IN_PAST);

      // todo: test if crawler does not overwrite events from other users
    });

    it('Should save other events retrieved from repeating event', async function () {
      const city = 'Karlsruhe';
      await this.Crawler.scrapeEventsViaSearch(city);
      const savedEvents = await getEvents(1, 100);
      expect(savedEvents.items.length).to.equal(4);
    });

  });

  describe('Adaptive Scraping Strategy For Search URLs Based on Event Discoveries', function () {

    this.beforeEach(async function () {
      await clearDatabase();

      const SCRAPER_CONFIG: DummyFacebookScraperConfig = {
        NO_EVENTS_FROM_SEARCH_URLS: true
      };
      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90
      };
      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        MIN_SCRAPE_TIME_DIFF_IN_DAYS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
      };

      this.TimeManager = new TimeManager();
      this.Scraper = new DummyFacebookScraper(SCRAPER_CONFIG);
      this.ScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
      this.ScrapeUrlManager = new ScrapeUrlManager(this.TimeManager, this.ScrapeUrlRepo, URL_MANAGER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, CRAWLER_CONFIG);
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;
    });

    it('Should cease scraping search URLs after a period of non-productivity', async function () {
      const city = 'Heidelberg';
      await this.Crawler.scrapeEventsViaSearch(city);

      this.TimeManager.setCurrentTime(moment().add(this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS, 'days').toDate());

      await this.Crawler.scrapeEventsViaSearch(city);

      const searchUrlsFinal = await getScrapeUrlsByCityAndType(city, UrlType.SEARCH_URL);

      expect(searchUrlsFinal[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.STALE);
    });
  });
});

// utils

async function clearDatabase() {
  const data_source = await Database.get_data_source();
  const eventRepo = data_source.getRepository(EventE);
  const upvoteRepo = data_source.getRepository(EventUpvoteE);
  const downvoteRepo = data_source.getRepository(EventDownvoteE);
  const scrapeUrlE = data_source.getRepository(ScrapeUrlE);

  await scrapeUrlE.delete({});
  await upvoteRepo.delete({});
  await downvoteRepo.delete({});
  await eventRepo.delete({});
}

async function getScrapeUrlsByCityAndType(city: string, urlType: UrlType): Promise<ScrapeUrlE[]> {
  const dataSource = await Database.get_data_source();

  const urls = await dataSource.getRepository(ScrapeUrlE).find({
    where: [
      {
        city,
        urlType: urlType,
      },
    ],
  });

  return urls;
}

async function getScrapeUrl(url): Promise<ScrapeUrlE> {
  const dataSource = await Database.get_data_source();

  const res = await dataSource.getRepository(ScrapeUrlE).findOne({
    where: [
      {
        url
      },
    ],
  });
  return res;
}