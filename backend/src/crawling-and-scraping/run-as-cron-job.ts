import Scheduler from './scheduler/Scheduler';
import { FacebookCrawlerConfig, SchedulerConfig, ScrapeUrlManagerConfig } from '../commons/enums';
import { ScrapeUrlE } from '../commons/typeorm_entities';
import { dataSource } from '../helpers';
import FacebookCrawler from './crawler/FacebookCrawler';
import TimeManager from './crawler/TimeManager';
import ScrapeUrlManager from './crawler/ScrapeUrlManager';
import FacebookScraper from './scraper/FacebookScraper';

const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
  LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 2,
  NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
  EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.75,
  SECOND_TRY_TO_SCRAPE_EVENT_IN_DAYS: 1,
};
const CRAWLER_CONFIG: FacebookCrawlerConfig = {
  STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
  ERROR_THRESHOLD: 5,
  EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM: 50,
};
const SCHEDULER_CONFIG: SchedulerConfig = {
  RUNTIME_ADJUSTMENT_FACTOR: 0.3,
  DEFAULT_INTERVAL_IN_SECONDS: 6 * 60 * 60,
};

(async () => {
  try {
    await dataSource.initialize();

    const scrapeUrlRepo = dataSource.getRepository(ScrapeUrlE);
    const timeManager = new TimeManager();
    const scraper = new FacebookScraper();
    const scrapeUrlManager = new ScrapeUrlManager(scrapeUrlRepo, timeManager, URL_MANAGER_CONFIG);
    const crawler = new FacebookCrawler(dataSource, scraper, scrapeUrlManager, timeManager, CRAWLER_CONFIG);
    const scheduler = new Scheduler(crawler, SCHEDULER_CONFIG);

    await scheduler.run();
  } finally {
    await dataSource.destroy();
  }
})();
