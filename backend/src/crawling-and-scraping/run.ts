import { FacebookCrawlerConfig, ScrapeUrlManagerConfig, UrlType } from '../commons/enums';
import { GroupE, ScrapeUrlE } from '../commons/typeorm_entities';
import { Database } from '../helpers';
import FacebookCrawler from './crawler/FacebookCrawler';
import TimeManager from './crawler/TimeManager';
import ScrapeUrlManager from './crawler/ScrapeUrlManager';
import FacebookScraper from './scraper/FacebookScraper';

const CRAWLER_CONFIG: FacebookCrawlerConfig = {
  STALE_URL_EXPIRY_TIME_IN_DAYS: 90,
  ERROR_THRESHOLD: 15,
};
const URL_MANAGER_CONFIG: ScrapeUrlManagerConfig = {
  LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS: 2,
  NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.5,
  EVENT_NEXT_SCRAPE_TIME_MULTIPLIER: 0.75,
};

(async () => {
  await start();
})();

export async function start() {
  const citiesToScrape = await fetchCitiesToBeScraped();

  for (const city of citiesToScrape) {
    await crawl(city);
  }
}

async function crawl(city: string) {
  const MyTimeManager = new TimeManager();
  const MyScraper = new FacebookScraper();
  const MyScrapeUrlRepo = (await Database.get_data_source()).getRepository(ScrapeUrlE);
  const MyScrapeUrlManager = new ScrapeUrlManager(MyTimeManager, MyScrapeUrlRepo, URL_MANAGER_CONFIG);
  const MyCrawler = new FacebookCrawler(MyScraper, MyScrapeUrlManager, MyTimeManager, CRAWLER_CONFIG);

  await MyCrawler.scrapeEventsViaSearch(city);
  await MyCrawler.scrapeEventsViaOrganizer(city);
  await MyCrawler.updateEvents(city);
}

async function fetchCitiesToBeScraped(): Promise<string[]> {
  const data_source = await Database.get_data_source();

  let allCities = await data_source
    .getRepository(GroupE)
    .createQueryBuilder('group')
    .select('group.location AS city')
    .addSelect('SUM(group.number_of_joins) AS joinCount')
    .groupBy('group.location')
    .orderBy('joinCount', 'DESC')
    .getRawMany();

  allCities = allCities.map(e => e.city);

  return allCities;
}
