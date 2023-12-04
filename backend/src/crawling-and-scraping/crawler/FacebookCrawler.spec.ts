import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import { expect } from 'chai';
import { dataSource } from '../../helpers';
import { EventE, ScrapeUrlE } from '../../commons/typeorm_entities';
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
import ScrapeUrlManager from './ScrapeUrlManager';
import { ERROR_THRESHOLD_EXCEEDED_MESSAGE } from '../../commons/constants';
import { EventsService } from '../../services/EventsService';
import { DataSource } from 'typeorm';
import { GroupsService } from '../../services/GroupsService';
import { get_user_id } from '../../helpers-for-tests/auth';
import { GroupReqBody } from '../../helpers-for-tests/backend_client';

describe('FacebookCrawler Functionality', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  describe('Scraping and Storing Results', function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    beforeEach(async function () {
      if (!dataSource.isInitialized) await dataSource.initialize();
      this.eventsService = new EventsService(dataSource);
      this.groupsService = new GroupsService(dataSource);

      await clearDatabase(dataSource);

      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
        SECOND_TRY_TO_SCRAPE_EVENT_IN_DAYS: 1,
      };
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;

      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 0,
        EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM: 50,
      };
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;

      // needed for group proximity test
      const user_id = await get_user_id();
      const groupReqBody: GroupReqBody = {
        title: 'Street Salsa',
        description: 'City Park',
        link: 'https://example.com/whatsapp-group',
        location: 'City Park',
        locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
        coordinates: {
          latitude: 49.0069,
          longitude: 8.4037,
        },
      };
      await this.groupsService.post_group(user_id, groupReqBody);
      this.city = 'Karlsruhe';
    });

    it('Should save events retrieved from search', async function () {
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG);

      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items.length).greaterThanOrEqual(1);
    });

    it('Should save events retrieved from organizer', async function () {
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG);

      await crawler.scrapeEventsViaSearch(this.city);
      const oldEvents = await this.eventsService.get_events(1, 100);

      await crawler.scrapeEventsViaOrganizer(this.city);
      const newEvents = await this.eventsService.get_events(1, 100);

      expect(newEvents.items.length).greaterThan(oldEvents.items.length);
    });

    it('Should update events', async function () {
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG);

      await crawler.scrapeEventsViaSearch(this.city);

      const event = (await this.eventsService.get_events(1, 1)).items[0];

      await crawler.scrapeOldEvents(this.city);

      const updatedEvent1 = await this.eventsService.get_event(event.event_id);

      expect(event).to.deep.equal(updatedEvent1);

      const now = crawler.timeManager.getCurrentTime();
      const eventStart = moment(updatedEvent1.unix_time);
      const halfTimeToStart = moment(eventStart).subtract(moment(now).diff(eventStart) / 2, 'milliseconds');
      const threeDaysBeforeStart = moment(eventStart).subtract(3, 'days');
      const nextScrape = moment.min(halfTimeToStart, threeDaysBeforeStart);

      crawler.timeManager.setCurrentTime(nextScrape.toDate());
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      crawler.scraper.updateSampleEventData!({
        usersInterested: event.numberOfInterests + 1,
      });

      await crawler.scrapeOldEvents(this.city);

      const updatedEvent2 = await this.eventsService.get_event(event.event_id);

      expect(event).not.to.deep.equal(updatedEvent2);
      expect(event.numberOfInterests).not.to.equal(updatedEvent2.numberOfInterests);

      crawler.timeManager.setCurrentTime(eventStart.toDate());

      await crawler.scrapeOldEvents(this.city);

      const scrapeUrl = await getScrapeUrl(crawler.dataSource, event.url);

      expect(scrapeUrl.scrapeUrlStatus).to.equal(ScrapeUrlStatus.IN_PAST);

      // todo: test if crawler does not overwrite events from other users
    });

    it('Should save events with missing coordinates', async function () {
      const scraperConfig: DummyFacebookScraperConfig = { EVENTS_ARE_MISSING_COORDINATES: true };
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items[0].coordinates.latitude).greaterThan(40);
      expect(savedEvents.items[0].coordinates.longitude).greaterThan(8);
    });

    it('Should save events with missing city', async function () {
      const scraperConfig: DummyFacebookScraperConfig = { EVENTS_ARE_MISSING_CITY: true };
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items[0].location).to.be.a('string');
      expect(savedEvents.items[0].location).to.include('Karlsruhe');
    });

    it('Only events not located in proximity to a designated group city should not be saved', async function () {
      const scraperConfig: DummyFacebookScraperConfig = { EVENTS_ARE_IN_ETTLINGEN: true };
      this.CRAWLER_CONFIG.EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM = 1;
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items.length).to.equal(0);
    });

    it('Only events located in proximity to a designated group city should be saved', async function () {
      const scraperConfig: DummyFacebookScraperConfig = { EVENTS_ARE_IN_ETTLINGEN: true };
      this.CRAWLER_CONFIG.EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM = 10;
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items.length).be.greaterThan(0);
    });

    // todo: right now the crawling of repeating events is disabled, because it is very inefficient
    it.skip('Should save other events retrieved from repeating event', async function () {
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG);
      await crawler.scrapeEventsViaSearch(this.city);
      const savedEvents = await this.eventsService.get_events(1, 100);
      expect(savedEvents.items.length).to.equal(4);
    });
  });

  describe('Adaptive Scraping Strategy For Search URLs Based on Event Discoveries', function () {
    this.beforeEach(async function () {
      if (!dataSource.isInitialized) await dataSource.initialize();

      await clearDatabase(dataSource);

      const CRAWLER_CONFIG: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 0,
        EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM: 50,
      };
      this.CRAWLER_CONFIG = CRAWLER_CONFIG;

      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
        SECOND_TRY_TO_SCRAPE_EVENT_IN_DAYS: 1,
      };
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;

      this.city = 'Heidelberg';
    });

    it('Avoid prematurely classifying scraped URLs as stale due to inactivity', async function () {
      const scraperConfig: DummyFacebookScraperConfig = {
        NO_EVENTS_FROM_SEARCH_URLS: true,
      };
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler.scrapeEventsViaSearch(this.city);

      crawler.timeManager.setCurrentTime(
        moment().add(this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS, 'days').toDate()
      );

      await crawler.scrapeEventsViaSearch(this.city);

      const searchUrlsFinal = await getScrapeUrlsByCityAndType(crawler.dataSource, this.city, UrlType.SEARCH_URL);

      expect(searchUrlsFinal[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.PROCESSED);
    });

    it('Verifies halting of scraping for search and organizer URLs with no relevant events after a set inactivity period', async function () {
      const scraperConfig: DummyFacebookScraperConfig = {
        IS_RETURNING_IRRELEVANT_EVENTS: true,
        GENERATE_NEW_EVENT_URLS: true,
      };
      const crawler = await initializeCrawler(this.CRAWLER_CONFIG, this.URL_MANAGER_CONFIG, scraperConfig);

      const expiryDays = this.CRAWLER_CONFIG.STALE_URL_EXPIRY_TIME_IN_DAYS;

      await crawler.scrapeEventsViaSearch(this.city);
      const searchUrlsFinal0 = await getScrapeUrlsByCityAndType(crawler.dataSource, this.city, UrlType.SEARCH_URL);
      expect(searchUrlsFinal0[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.PROCESSED);

      crawler.timeManager.setCurrentTime(
        moment()
          .add(expiryDays / 2, 'days')
          .toDate()
      );

      await crawler.scrapeEventsViaSearch(this.city);
      const searchUrlsFinal1 = await getScrapeUrlsByCityAndType(crawler.dataSource, this.city, UrlType.SEARCH_URL);
      expect(searchUrlsFinal1[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.PROCESSED);

      crawler.timeManager.setCurrentTime(moment().add(expiryDays, 'days').toDate());

      await crawler.scrapeEventsViaSearch(this.city);
      const searchUrlsFinal2 = await getScrapeUrlsByCityAndType(crawler.dataSource, this.city, UrlType.SEARCH_URL);
      expect(searchUrlsFinal2[0].scrapeUrlStatus).to.equal(ScrapeUrlStatus.STALE);
    });
  });

  describe('Scraping Error Handling', function () {
    this.beforeEach(async function () {
      if (!dataSource.isInitialized) await dataSource.initialize();

      await clearDatabase(dataSource);

      const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
        LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 3,
        NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
        EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.5,
        SECOND_TRY_TO_SCRAPE_EVENT_IN_DAYS: 1,
      };
      this.URL_MANAGER_CONFIG = URL_MANAGER_CONFIG;
    });

    it('Process should terminate when number of scraping errors exceeds threshold', async function () {
      const newScraperConfig: DummyFacebookScraperConfig = {
        IS_THROWING_ERRORS: true,
      };
      const newCrawlerConfig: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 0,
        EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM: 50,
      };
      const crawler1 = await initializeCrawler(newCrawlerConfig, this.URL_MANAGER_CONFIG, newScraperConfig);

      try {
        await crawler1.run();
        throw new Error('Should not reach this line');
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).to.equal(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
        } else {
          throw err;
        }
      }

      newCrawlerConfig.ERROR_THRESHOLD = Number.MAX_SAFE_INTEGER;
      const crawler2 = await initializeCrawler(newCrawlerConfig, this.URL_MANAGER_CONFIG, newScraperConfig);

      await crawler2.run();
    });

    it('Should continue processing when scraper errors occur less frequently than the error threshold', async function () {
      const scraperConfig: DummyFacebookScraperConfig = {
        IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME: true,
      };
      const crawlerConfig: FacebookCrawlerConfig = {
        STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
        ERROR_THRESHOLD: 1,
        EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM: 50,
      };

      const crawler1 = await initializeCrawler(crawlerConfig, this.URL_MANAGER_CONFIG, scraperConfig);

      try {
        await crawler1.run();
        throw new Error('Should not reach this line');
      } catch (err) {
        if (err instanceof Error) {
          expect(err.message).to.equal(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
        } else {
          throw err;
        }
      }

      crawlerConfig.ERROR_THRESHOLD = 2;
      const crawler2 = await initializeCrawler(crawlerConfig, this.URL_MANAGER_CONFIG, scraperConfig);

      await crawler2.run();
    });
  });
});

// utils

async function initializeCrawler(
  crawlerConfig: FacebookCrawlerConfig,
  urlManagerConfig: ScrapeUrlManagerConfig,
  scraperConfig?: DummyFacebookScraperConfig
): Promise<FacebookCrawler> {
  const timeManager = new TimeManager();
  const scraper = new DummyFacebookScraper(scraperConfig);
  const scrapeUrlRepo = dataSource.getRepository(ScrapeUrlE);
  const scrapeUrlManager = new ScrapeUrlManager(scrapeUrlRepo, timeManager, urlManagerConfig);

  return new FacebookCrawler(dataSource, scraper, scrapeUrlManager, timeManager, crawlerConfig);
}

async function clearDatabase(dataSource) {
  const eventRepo = dataSource.getRepository(EventE);
  const scrapeUrlE = dataSource.getRepository(ScrapeUrlE);

  await scrapeUrlE.delete({});
  await eventRepo.delete({});
}

async function getScrapeUrlsByCityAndType(
  dataSource: DataSource,
  city: string,
  urlType: UrlType
): Promise<ScrapeUrlE[]> {
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

async function getScrapeUrl(dataSource: DataSource, url): Promise<ScrapeUrlE> {
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
