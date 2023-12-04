interface IFacebookCrawler {
  run(): Promise<void>;
  scrapeEventsViaSearch(city: string): Promise<void>;
  scrapeOldEvents(city: string): Promise<void>;
  scrapeEventsViaOrganizer(city: string): Promise<void>;
}

export default IFacebookCrawler;
