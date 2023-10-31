
 interface IFacebookCrawler {
    scrapeEventsViaSearch(city: string): Promise<void>;
    updateEvents(city: string): Promise<void>;
    scrapeEventsViaOrganizer(city: string): Promise<void>;
  }

export default IFacebookCrawler;