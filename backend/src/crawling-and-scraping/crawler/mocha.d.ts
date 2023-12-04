import 'mocha'; // Import mocha types so that we can extend them
import TimeManager from './TimeManager';
import FacebookCrawler from './FacebookCrawler';
import { FacebookCrawlerConfig } from '../../commons/enums';
import IFacebookScraper from '../scraper/IFacebookScraper';

declare module 'mocha' {
  // Extend the Mocha context with additional properties
  export interface Context {
    TimeManager: TimeManager;
    Scraper: IFacebookScraper;
    Crawler: FacebookCrawler;
    CRAWLER_CONFIG: FacebookCrawlerConfig;
  }
}
