import { Database } from '../../helpers';
import { EventE, EventUpvoteE, ScrapeUrlE } from '../../commons/typeorm_entities';
import { FacebookCrawlerConfig, SCRAPE_RESULT, ScrapeUrlStatus, UrlType, Votes } from '../../commons/enums';
import { EventData } from 'facebook-event-scraper/dist/types';
import { EventReqBody, RecurringPattern } from '../../helpers-for-tests/backend_client';
import { find_event_by_coordinates_and_time, save_event, save_vote } from '../../services/EventsService';
import { get_user_id } from '../../helpers-for-tests/auth';
import axios from 'axios';
import { createLogger, format, transports } from 'winston';
import IFacebookCrawler from './IFacebookCrawler';
import IFacebookScraper from '../scraper/IFacebookScraper';
import { v2 as cloudinary } from 'cloudinary';
import TimeManager from './TimeManager';
import ScrapeUrlManager from './ScrapeUrlManager';
import moment from 'moment';

const BASE_URL = 'https://www.facebook.com/events/search?q=';
const SEARCH_TERMS = [
  'latin',
  'latino',
  'salsa',
  'bachata',
  'kizomba',
  'sabaki',
  'merengue',
  'salsa open air',
  'havanna',
];
const FB_DANCE_CATEGORY_ID = '131382910960785';

const logger = createLogger({
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
});

export default class FacebookCrawler implements IFacebookCrawler {
  private Scraper: IFacebookScraper;
  private TimeManager: TimeManager;
  private ScrapeUrlManager: ScrapeUrlManager;
  private config: FacebookCrawlerConfig;

  constructor(scraper: IFacebookScraper, ScrapeUrlManager: ScrapeUrlManager, TimeManager: TimeManager, config: FacebookCrawlerConfig) {
    this.Scraper = scraper;
    this.config = config;
    this.TimeManager = TimeManager;
    this.ScrapeUrlManager = ScrapeUrlManager;
  }

  public async updateEvents(city: string) {
    logger.info(`Starting to update events for city: ${city}`);

    await this.ScrapeUrlManager.updateAllExpiredEventUrlStatus(city);

    const eventUrlsE = await this.ScrapeUrlManager.getEligibleScrapeUrls(city, UrlType.EVENT_URL);
    const eventUrls = eventUrlsE.map((eventUrlE) => eventUrlE.url);

    for (const eventUrl of eventUrls) {
      try {
        const eventData = await this.scrapeEventData(eventUrl);
        if (!eventData) continue;

        var eventStart = new Date(eventData.startTimestamp * 1000);

        await this.updateEvent(eventData);

        await this.ScrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.PROCESSED);

      } catch (err) {
        console.error(err);
        await this.ScrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.FAILED_TO_PROCESS);
      }
    }

    logger.info(`Finished updating events for city: ${city}`);
  }

  public async scrapeEventsViaSearch(city: string) {
    logger.info(`Starting via Search for city: ${city}`);

    await this.createSearchUrlsIfNotExist(city);
    const searchUrlsE = await this.ScrapeUrlManager.getEligibleScrapeUrls(city, UrlType.SEARCH_URL);

    for (const searchUrlE of searchUrlsE) {
      console.info('Processing search url: ', searchUrlE.url);
      const scrapeResult = await this.processSearchUrl(searchUrlE, city);
      await this.ScrapeUrlManager.updateSearchUrl(searchUrlE.url, scrapeResult);
    }

    logger.info(`Finished scraping via Search for city: ${city}`);
  }

  public async scrapeEventsViaOrganizer(city: string) {
    logger.info(`Starting to scrape via Organizer for city: ${city}`);

    const organizerUrlsE = await this.ScrapeUrlManager.getEligibleScrapeUrls(city, UrlType.ORGANIZER_URL);

    for (const organizerUrlE of organizerUrlsE) {
      console.info('Processing organizer url: ', organizerUrlE.url);
      const scrapeResult = await this.processOrganizerUrl(organizerUrlE, city);
      await this.ScrapeUrlManager.updateOrganizerUrl(organizerUrlE.url, scrapeResult);
    }

    logger.info(`Finished scraping via Organizer for city: ${city}`);
  }

  // utils

  private processSearchUrl(urlE: ScrapeUrlE, city: string): Promise<SCRAPE_RESULT> {
    return this.processUrl(urlE, city);
  }

  private processOrganizerUrl(urlE: ScrapeUrlE, city: string): Promise<SCRAPE_RESULT> {
    return this.processUrl(urlE, city);
  }

  private async processUrl(urlE: ScrapeUrlE, city: string): Promise<SCRAPE_RESULT> {
    if (this.chackIfUrlIsStale(urlE)) {
      return SCRAPE_RESULT.STALE;
    }

    const newEventUrls = await this.retrieveNewEventUrls(urlE);

    if (newEventUrls.length === 0) {
      return SCRAPE_RESULT.NO_NEW_EVENTS_FOUND;
    }

    const { numberOfSavedEvents } = await this.scrapeEventUrls(newEventUrls, city);

    if (numberOfSavedEvents === 0) {
      return SCRAPE_RESULT.NO_RELEVANT_FUTURE_EVENTS_FOUND;
    }

    return SCRAPE_RESULT.EVENTS_FOUND;
  }

  private async retrieveNewEventUrls(urlE: ScrapeUrlE): Promise<string[]> {
    switch (urlE.urlType) {
    case UrlType.SEARCH_URL:
      return this.getNewEventUrlsViaSearch(urlE.url);
    case UrlType.ORGANIZER_URL:
      return this.getNewEventUrlsViaOrganizer(urlE.url);
    default:
      throw new Error('Invalid url type');
    }
  }

  private async scrapeEventUrls(eventUrls: string[], city: string): Promise<{ numberOfSavedEvents: number }> {

    const existingUrls = await this.ScrapeUrlManager.getScrapeUrls(eventUrls);
    const existingUrlsSet = new Set(existingUrls.map((record) => record.url));

    const queue = [...eventUrls];
    const visitedUrls = new Set<string>();
    let numberOfSavedEvents = 0;

    while (queue.length > 0) {

      const eventUrl = queue.shift();

      if (visitedUrls.has(eventUrl)) {
        continue;
      }
      visitedUrls.add(eventUrl);

      try {

        if (existingUrlsSet.has(eventUrl)) // prevent scraping the same url twice in case of repeating events
          continue;

        const eventData = await this.scrapeEventData(eventUrl);
        if (!eventData) continue;

        const relevant = this.isEventRelevant(eventData);

        var eventStart = new Date(eventData.startTimestamp * 1000);
        const inFuture = eventStart > this.TimeManager.getCurrentTime();

        if (relevant) {
          const organizerUrl = await this.scrapeOrganizerUrl(eventUrl);

          if (organizerUrl)
            await this.ScrapeUrlManager.saveOrganizerUrl(organizerUrl, city);

          const otherEventUrls = await this.scrapeOtherEventUrls(eventUrl);

          for (const otherEventUrl of otherEventUrls) {
            // Only add to queue if it has not already been in the queue
            // Only add to queue if it does not exist in the database
            if (!existingUrlsSet.has(otherEventUrl) && !visitedUrls.has(otherEventUrl))
              queue.push(otherEventUrl);
          }

          if (inFuture) {
            await this.saveEvent(eventData);

            await this.ScrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.PROCESSED);

            numberOfSavedEvents++;

          } else {
            await this.ScrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.IN_PAST);
          }
        } else {
          await this.ScrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.NOT_RELEVANT);
        }

      } catch (err) {
        console.error(err);
        await this.ScrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.FAILED_TO_PROCESS);
      }
    }
    return { numberOfSavedEvents };
  }

  private chackIfUrlIsStale(searchUrlE: ScrapeUrlE) {
    const now = moment(this.TimeManager.getCurrentTime());
    const lastFound = moment(searchUrlE.lastFound ?? searchUrlE.createdAt);
    const diffInDays = now.diff(lastFound, 'days');
    const expiryTime = this.config.STALE_URL_EXPIRY_TIME_IN_DAYS;

    if (diffInDays >= expiryTime) {
      return true;
    } else {
      return false;
    }
  }

  isEventRelevant(eventData) {
    const name = eventData.name.toLowerCase();
    const locationName = eventData.location?.name.toLowerCase();
    const desc = eventData.description.toLowerCase();

    const positiveNameKeywords = ['salsa', 'bachata', 'kizomba', 'sabaki'];
    if (positiveNameKeywords.some((keyword) => name.includes(keyword))) return true;
    if (locationName && positiveNameKeywords.some((keyword) => locationName.includes(keyword))) return true;

    const positiveDescriptionKeywords = ['salsa', 'kizomba', 'sabaki'];
    if (positiveDescriptionKeywords.some((keyword) => desc.includes(keyword))) return true;

    if (desc.includes('bachata') && !desc.includes('reggaeton')) return true;

    return false;
  }

  async updateEvent(eventData: EventData) {
    const user_id = await get_user_id();
    const coordinates = await this.getEventCoordinates(eventData);
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.getEventLocation(city, eventData.location.name);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);

    const existing_event = await find_event_by_coordinates_and_time(eventReqBody.unix_time, eventReqBody.coordinates);

    await this.updateEventsAndVotes(existing_event.event_id, user_id, eventReqBody, eventData.usersInterested);
    this.logEventAction('updated', existing_event.event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async saveEvent(eventData: EventData) {
    const user_id = await get_user_id();
    const coordinates = await this.getEventCoordinates(eventData);
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.getEventLocation(city, eventData.location.name);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);

    // temp fix for data from old schema where urls are not normalized
    const existing_event = await find_event_by_coordinates_and_time(eventReqBody.unix_time, eventReqBody.coordinates);
    if (existing_event) {
      console.warn(`Temp Fix: Event with the same coordinates and time already exists in the database. Event is not saved. Scraped Event: ${eventData.url}`);
      return;
    }

    const event_id = await this.saveEventAndVotes(user_id, eventReqBody, eventData.usersInterested);
    this.logEventAction('saved', event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async getEventCoordinates(eventData: EventData): Promise<[number, number]> {
    if (eventData.location?.coordinates) {
      return [eventData.location.coordinates.longitude, eventData.location.coordinates.latitude];
    } else if (eventData.location?.name) {
      return this.getCoordinatesByLocationName(eventData.location.name);
    } else {
      throw new Error(`Missing location name and coordinates. Event cannot be saved. Scraped Event: ${eventData.url}`);
    }
  }

  createEventRequestBody(eventData: EventData, coordinates: [number, number], location: string): EventReqBody {
    return {
      unix_time: eventData.startTimestamp * 1000,
      recurring_pattern: RecurringPattern.NONE,
      title: eventData.name,
      description: eventData.description,
      location,
      locationUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates[1]},${coordinates[0]}`,
      coordinates,
      image_url: eventData.photo.imageUri,
      url: eventData.url,
    };
  }

  async getEventCity(eventData: EventData, coordinates: [number, number]): Promise<string> {
    if (eventData.location.city?.name) {
      return eventData.location.city.name;
    }
    return this.getCityByCoordinates(coordinates[0], coordinates[1]);
  }

  getEventLocation(city: string, baseLocation: string): string {
    if (city && !baseLocation.includes(city)) {
      return `${city}, ${baseLocation}`;
    }
    return baseLocation;
  }

  async saveEventAndVotes(
    user_id: string,
    eventReqBody: EventReqBody,
    usersInterested: number | null
  ): Promise<string> {
    const event = await save_event(null, user_id, eventReqBody);

    const EventRepo = await Database.get_repo(EventE);
    event.image_url = await this.generateCloudinaryURL(event.event_id, event.image_url);
    const { event_id } = await EventRepo.save({ ...event });

    if (usersInterested) {
      await save_vote(event.event_id, user_id, Votes.UP, usersInterested);
    }
    return event_id;
  }

  async updateEventsAndVotes(
    event_id: string,
    user_id: string,
    req_body: EventReqBody,
    number_of_votes: number
  ): Promise<EventE> {
    const EventRepo = await Database.get_repo(EventE);

    // update votes
    if (number_of_votes) {
      const VoteRepo = await Database.get_repo(EventUpvoteE);
      // Get old number of votes and calculate votes difference
      const oldVotes = await this.fetchOldVotes(VoteRepo, event_id);
      const votes_diff = number_of_votes - oldVotes;
      // Update votes and event stats
      await this.updateVotes(VoteRepo, event_id, user_id, number_of_votes);
      await this.updateEventStats(event_id, votes_diff);
    }

    //  update event
    const eventDetails = await this.constructEventDetails(req_body, user_id);
    eventDetails.image_url = await this.generateCloudinaryURL(event_id, eventDetails.image_url);

    const updatedEvent = await EventRepo.save({ event_id, ...eventDetails });

    return updatedEvent;
  }

  async generateCloudinaryURL(event_id: string, url: string): Promise<string> {
    // Initialize Cloudinary with your cloud name, API key, and API secret
    cloudinary.config({
      secure: true,
    });

    try {
      const uploadedImage = await cloudinary.uploader.upload(url, {
        public_id: event_id,
      });

      // Return the URL of the uploaded image
      return uploadedImage.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  async fetchOldVotes(VoteRepo, event_id: string): Promise<number> {
    const user_id = await get_user_id();
    const res = await VoteRepo.findOne({ where: { event_id, user_id } });
    return res?.number_of_votes ?? 0;
  }

  async updateVotes(repo, event_id: string, user_id: string, number_of_votes: number) {
    return await repo.save({ event_id, user_id, number_of_votes });
  }

  async updateEventStats(event_id: string, votes_diff: number) {
    const dateSource = await Database.get_data_source();
    await dateSource
      .createQueryBuilder()
      .update(EventE)
      .set({
        upvotes_sum: () => `upvotes_sum + ${votes_diff}`,
        votes_diff: () => `votes_diff + ${votes_diff}`,
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  }

  async constructEventDetails(body: EventReqBody, user_id: string) {
    const { unix_time, title, description, location, locationUrl, coordinates, image_url, url, recurring_pattern } =
      body;

    const eventDetails: Partial<EventE> = {
      created_by: user_id,
      updated_by: user_id,
      unix_time,
      title,
      description,
      location,
      locationUrl,
      image_url,
      url,
      recurring_pattern,
    };

    if (coordinates) {
      eventDetails.location_point = { type: 'Point', coordinates };
    }

    return eventDetails;
  }

  logEventAction(action: string, eventId: string, eventName: string, eventTime: number, eventLocation: string): void {
    const formattedTime = this.formatEventTime(eventTime);
    const actionText = action.charAt(0).toUpperCase() + action.slice(1); // Capitalize the first letter

    console.info(`
        Event ${actionText} Successfully:
        ----------------------------------------------
        Title       : ${eventName}
        Date & Time : ${formattedTime}
        Location    : ${eventLocation}
        Event ID    : ${eventId}
        ----------------------------------------------
        Description : Event with the provided ID has been ${action} in the database.
    `);
  }

  formatEventTime(eventTime: number): string {
    return new Date(eventTime).toLocaleString();
  }

  async getCoordinatesByLocationName(location: string): Promise<[longitude: number, latitude: number]> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${
      process.env.GOOGLE_MAPS_API_KEY
    }`;

    try {
      const {
        data: { results },
      } = await axios.get(url);

      if (results && results.length > 0) {
        const {
          geometry: { location: loc },
        } = results[0];
        return [loc.lng, loc.lat];
      }

      console.warn(`No results for ${location}`);
      return null;
    } catch (error: any) {
      console.error(`Error fetching coordinates for ${location}:`, error);
      throw error;
    }
  }

  async getCityByCoordinates(longitude: number, latitude: number): Promise<string> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    try {
      const {
        data: { results },
      } = await axios.get(url);

      if (results && results.length > 0) {
        for (const result of results) {
          for (const component of result.address_components) {
            if (component.types.includes('locality')) {
              return component.long_name;
            }
          }
        }
      }

      console.warn(`No city found for coordinates: ${latitude}, ${longitude}`);
      return 'Unknown';
    } catch (error: any) {
      console.error(`Error fetching city for coordinates: ${latitude}, ${longitude}:`, error);
      throw error;
    }
  }

  async scrapeEventData(eventUrl: string): Promise<EventData> {
    const eventData = await this.saveFetchEventData(eventUrl);
    return eventData;
  }

  async scrapeOtherEventUrls(eventUrl: string): Promise<string[]> {
    const otherEventUrls = await this.saveFetchOtherEventURLsFromEvent(eventUrl);
    return otherEventUrls;
  }

  async saveFetchOtherEventURLsFromEvent(eventUrl: string): Promise<string[]> {
    try {
      return await this.Scraper.fetchOtherEventURLsFromEvent(eventUrl);
    } catch (err) {
      console.error(`Error fetching other event URLs from Event Url ${eventUrl}:`, err);
      return [];
    }
  }

  async scrapeOrganizerUrl(eventUrl: string): Promise<string> {
    const organizatorUrl = await this.saveFetchOrganizerUrlFromEventUrl(eventUrl);
    return organizatorUrl;
  }

  async saveFetchOrganizerUrlFromEventUrl(searchUrl: string): Promise<string> {
    try {
      return await this.Scraper.fetchOrganizerUrlFromEvent(searchUrl);
    } catch (err) {
      console.error(`Error fetching Organizer URL from Event Url ${searchUrl}:`, err);
      return null;
    }
  }

  async saveFetchEventUrlsFromOrganizerUrl(organizerUrl: string): Promise<string[]> {
    try {
      return await this.Scraper.fetchEventUrlsFromOrganizerUrl(organizerUrl);
    } catch (err) {
      console.error(`Unexpected Error fetching URLs from organizator url ${organizerUrl}:`, err);
      return [];
    }
  }

  async getNewEventUrlsViaOrganizer(organizerUrl: string): Promise<string[]> {
    const eventUrls = await this.saveFetchEventUrlsFromOrganizerUrl(organizerUrl);
    return this.filterNewEventUrls(eventUrls);
  }

  async getNewEventUrlsViaSearch(searchUrl: string): Promise<string[]> {
    const eventUrls = await this.saveFetchEventUrlsFromSearchUrl(searchUrl);
    return this.filterNewEventUrls(eventUrls);
  }

  private async filterNewEventUrls(eventUrls: string[]): Promise<string[]> {
    if (eventUrls.length === 0) {
      return [];
    }

    // Retrieve existing URLs from the database to compare
    const existingUrls = await this.ScrapeUrlManager.getScrapeUrls(eventUrls);

    // Create a set for faster lookup
    const existingUrlsSet = new Set(existingUrls.map((record) => record.url));

    // Return URLs that don't already exist in the database
    return eventUrls.filter((url) => !existingUrlsSet.has(url));
  }

  async saveFetchEventUrlsFromSearchUrl(searchUrl: string): Promise<string[]> {
    try {
      return await this.Scraper.fetchEventUrlsFromSearchUrl(searchUrl);
    } catch (err) {
      console.error(`Error fetching URLs for search URL ${searchUrl}:`, err);
      return [];
    }
  }

  async saveFetchEventData(eventUrl: string): Promise<EventData> {
    try {
      return await this.Scraper.fetchEventData(eventUrl);
    } catch (err) {
      console.error(`Error fetching event data for event URL ${eventUrl}:`, err);
      return null;
    }
  }

  async createSearchUrlsIfNotExist(city: string) {
    const scrapeUrlsE: ScrapeUrlE[] = [];

    const searchUrls = this.generateSearchUrlsForCity(city);

    const existingSearchUrls = await this.ScrapeUrlManager.getScrapeUrls(searchUrls);

    if (existingSearchUrls.length > 0)
      return;

    for (const searchUrl of searchUrls) {
      const scrapeUrlE = await this.ScrapeUrlManager.saveSearchUrl(searchUrl, city);
      scrapeUrlsE.push(scrapeUrlE);
    }
  }

  generateSearchUrlsForCity(city: string): string[] {
    const searchUrls = SEARCH_TERMS.map((term) => `${BASE_URL}${encodeURIComponent(`${term} ${city}`)}`);

    const categoryFilter = this.getCategoryFilter();
    searchUrls.push(`${BASE_URL}${encodeURIComponent(city)}&filters=${categoryFilter}`);

    return searchUrls;
  }

  getCategoryFilter(): string {
    const filter = {
      ['filter_events_category:0']: JSON.stringify({
        name: 'filter_events_category',
        args: FB_DANCE_CATEGORY_ID,
      }),
    };

    // Convert the filters object into a string
    const filterString: string = JSON.stringify(filter);

    // Encode the string using Base64
    const encodedFilter: string = btoa(filterString);

    return encodeURI(encodedFilter);
  }
}
