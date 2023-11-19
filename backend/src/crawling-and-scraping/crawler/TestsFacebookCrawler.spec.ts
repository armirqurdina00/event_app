import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import { expect } from 'chai';
import { Database } from '../../helpers';
import { EventDownvoteE, EventE, EventUpvoteE, ScrapeUrlE } from '../../commons/typeorm_entities';
import {
  DummyFacebookScraperConfig,
  FacebookCrawlerConfig,
  ScrapeUrlManagerConfig,
  ScrapeUrlStatus,
  UrlType,
} from '../../commons/enums';
import FacebookCrawler from './FacebookCrawler';
import DummyFacebookScraper from '../scraper/DummyFacebookScraper';
import moment from 'moment';
import TimeManager from './TimeManager';
import { get_events as getEvents, get_event as getEvent } from '../../services/EventsService';
import ScrapeUrlManager from './ScrapeUrlManager';
import { ERROR_THRESHOLD_EXCEEDED_MESSAGE } from '../../commons/constants';

describe('FacebookCrawler Functionality', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  describe('Scraping and Storing Results', function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    beforeEach(async function () {
      await clearDatabase();

      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 0,
      };
      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
      };
      this.TimeManager = new TimeManager();
      this.Scraper = new DummyFacebookScraper();
      this.ScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
      this.ScrapeUrlManager = new ScrapeUrlManager(this.TimeManager, this.ScrapeUrlRepo, URL_MANAGER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, CRAWLER_CONFIG);
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.Scraper.updateSampleEventData!({
        usersInterested: event.upvotes_sum + 1,
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

    it('Should save events with missing coordinates', async function () {
      this.Scraper = new DummyFacebookScraper({ EVENTS_ARE_MISSING_COORDINATES: true });
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      const city = 'Karlsruhe';
      await this.Crawler.scrapeEventsViaSearch(city);
      const savedEvents = await getEvents(1, 100);
      expect(savedEvents.items[0].coordinates[0]).greaterThan(0);
      expect(savedEvents.items[0].coordinates[1]).greaterThan(0);
    });

    it('Should save events with missing city', async function () {
      this.Scraper = new DummyFacebookScraper({ EVENTS_ARE_MISSING_CITY: true });
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      const city = 'Karlsruhe';
      await this.Crawler.scrapeEventsViaSearch(city);
      const savedEvents = await getEvents(1, 100);
      expect(savedEvents.items[0].location).to.be.a('string');
      expect(savedEvents.items[0].location).to.include('Karlsruhe');
    });

    // todo: right now the crawling of repeating events is disabled, because it is very inefficient
    it.skip('Should save other events retrieved from repeating event', async function () {
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
        NO_EVENTS_FROM_SEARCH_URLS: true,
      };
      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 0,
      };
      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
      };

      this.TimeManager = new TimeManager();
      this.Scraper = new DummyFacebookScraper(SCRAPER_CONFIG);
      this.ScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
      this.ScrapeUrlManager = new ScrapeUrlManager(this.TimeManager, this.ScrapeUrlRepo, URL_MANAGER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, CRAWLER_CONFIG);
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;
    });

    it('Avoid prematurely classifying scraped URLs as stale due to inactivity', async function () {
      const city = 'Heidelberg';
      await this.Crawler.scrapeEventsViaSearch(city);

      this.TimeManager.setCurrentTime(moment().add(this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS, 'days').toDate());

      await this.Crawler.scrapeEventsViaSearch(city);

      const searchUrlsFinal = await getScrapeUrlsByCityAndType(city, UrlType.SEARCH_URL);

      expect(searchUrlsFinal[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.PROCESSED);
    });

    it('Verifies halting of scraping for search and organizer URLs with no relevant events after a set inactivity period', async function () {
      const city = 'Heidelberg';

      const SCRAPER_CONFIG: DummyFacebookScraperConfig = {
        IS_RETURNING_IRRELEVANT_EVENTS: true,
        GENERATE_NEW_EVENT_URLS: true,
      };

      this.Scraper = new DummyFacebookScraper(SCRAPER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      await this.Crawler.scrapeEventsViaSearch(city);

      this.TimeManager.setCurrentTime(
        moment()
          .add(this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS / 2, 'days')
          .toDate()
      );

      await this.Crawler.scrapeEventsViaSearch(city);

      this.TimeManager.setCurrentTime(moment().add(this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS, 'days').toDate());

      await this.Crawler.scrapeEventsViaSearch(city);

      const searchUrlsFinal = await getScrapeUrlsByCityAndType(city, UrlType.SEARCH_URL);

      expect(searchUrlsFinal[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.STALE);
    });
  });

  describe('Scraping Error Handling', function () {
    this.beforeEach(async function () {
      await clearDatabase();

      const SCRAPER_CONFIG: DummyFacebookScraperConfig = {
        IS_THROWING_ERRORS: true,
      };
      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
      };
      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 5,
      };

      this.TimeManager = new TimeManager();
      this.Scraper = new DummyFacebookScraper(SCRAPER_CONFIG);
      this.ScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
      this.ScrapeUrlManager = new ScrapeUrlManager(this.TimeManager, this.ScrapeUrlRepo, URL_MANAGER_CONFIG);
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, CRAWLER_CONFIG);
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;
    });

    it('Process should terminate when number of scraping errors exceeds threshold', async function () {
      const city = 'Heidelberg';
      try {
        await this.Crawler.scrapeEventsViaSearch(city);
        throw new Error('Should not reacht this line');
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).to.equal(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
        } else {
          throw err;
        }
      }

      this.CRAWLER_CONFIG = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: Number.MAX_SAFE_INTEGER,
      };

      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      await this.Crawler.scrapeEventsViaSearch(city);
    });

    it('Should continue processing when scraper errors occur less frequently than the error threshold', async function () {
      const city = 'Heidelberg';

      this.Scraper = new DummyFacebookScraper({
        IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME: true,
      });

      this.CRAWLER_CONFIG = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 1,
      };
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      try {
        await this.Crawler.scrapeEventsViaSearch(city);
        throw new Error('Should not reach this line');
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).to.equal(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
        } else {
          throw err;
        }
      }

      this.CRAWLER_CONFIG = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 2,
      };
      this.Crawler = new FacebookCrawler(this.Scraper, this.ScrapeUrlManager, this.TimeManager, this.CRAWLER_CONFIG);

      await this.Crawler.scrapeEventsViaSearch(city);
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
        url,
      },
    ],
  });

  if (res === null) throw new Error('Scrape URL not found');

  return res;
}
