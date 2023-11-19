import { EventData } from 'facebook-event-scraper/dist/types';

interface IFacebookScraper {
  fetchEventUrlsFromSearchUrl(url: string): Promise<string[]>;
  fetchEventUrlsFromOrganizerUrl(url: string): Promise<string[]>;
  fetchOrganizerUrlFromEvent(url: string): Promise<string>;
  fetchRepeatingEventURLsFromEvent(url: string): Promise<string[]>;
  fetchEventData(url: string): Promise<EventData>;
  updateSampleEventData?(updates: Partial<EventData>): void;
}

export default IFacebookScraper;
