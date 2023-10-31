import { EventData } from 'facebook-event-scraper/dist/types';
import { DummyFacebookScraperConfig } from 'src/commons/enums';

interface IFacebookScraper {
  fetchEventUrlsFromSearchUrl(url: string): Promise<string[]>;
  fetchEventUrlsFromOrganizerUrl(url: string): Promise<string[]>;
  fetchOrganizerUrlFromEvent(url: string): Promise<string>;
  fetchOtherEventURLsFromEvent(url: string): Promise<string[]>;
  fetchEventData(url: string): Promise<EventData>;
  setConfig?(config: DummyFacebookScraperConfig): void;
  updateSampleEventData?(updates: Partial<EventData>): void;
}

export default IFacebookScraper;