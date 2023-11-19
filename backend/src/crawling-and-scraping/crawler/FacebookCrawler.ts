import { Database } from '../../helpers';
import { EventE, EventUpvoteE, ScrapeUrlE } from '../../commons/typeorm_entities';
import { FacebookCrawlerConfig, SCRAPE_RESULT, ScrapeUrlStatus, UrlType, Votes } from '../../commons/enums';
import { EventData } from 'facebook-event-scraper/dist/types';
import { EventReqBody, RecurringPattern } from '../../helpers-for-tests/backend_client';
import { find_event_by_coordinates_and_time, save_event, save_vote } from '../../services/EventsService';
import { get_user_id } from '../../helpers-for-tests/auth';
import { createLogger, format, transports } from 'winston';
import IFacebookCrawler from './IFacebookCrawler';
import IFacebookScraper from '../scraper/IFacebookScraper';
import { v2 as cloudinary } from 'cloudinary';
import TimeManager from './TimeManager';
import ScrapeUrlManager from './ScrapeUrlManager';
import moment from 'moment';
import { ERROR_THRESHOLD_EXCEEDED_MESSAGE } from '../../commons/constants';
import { AddressType, Client } from '@googlemaps/google-maps-services-js';

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
    format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
});

export default class FacebookCrawler implements IFacebookCrawler {
  private Scraper: IFacebookScraper;
  private TimeManager: TimeManager;
  private ScrapeUrlManager: ScrapeUrlManager;
  private config: FacebookCrawlerConfig;
  private errorCounter: number;

  constructor(
    scraper: IFacebookScraper,
    ScrapeUrlManager: ScrapeUrlManager,
    TimeManager: TimeManager,
    config: FacebookCrawlerConfig
  ) {
    this.Scraper = scraper;
    this.config = config;
    this.TimeManager = TimeManager;
    this.ScrapeUrlManager = ScrapeUrlManager;
    this.errorCounter = 0;
  }

  public async updateEvents(city: string) {
    logger.info(`Starting to update events for city: ${city}`);

    await this.ScrapeUrlManager.updateAllExpiredEventUrlStatus(city);

    const eventUrlsE = await this.ScrapeUrlManager.getEligibleScrapeUrls(city, UrlType.EVENT_URL);
    const eventUrls = eventUrlsE.map(eventUrlE => eventUrlE.url);

    for (const eventUrl of eventUrls) {
      const eventData = await this.scrapeEventData(eventUrl);
      if (!eventData) {
        await this.ScrapeUrlManager.updateEventUrl(eventUrl, null, ScrapeUrlStatus.PROCESSED);
        continue;
      }

      var eventStart = new Date(eventData.startTimestamp * 1000);

      try {
        await this.updateEvent(eventData);
      } catch (err) {
        console.error(`Error updating event ${eventUrl}:`, err);
      }

      await this.ScrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.PROCESSED);
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
    return this.processSearchOrOrganizerUrl(urlE, city);
  }

  private processOrganizerUrl(urlE: ScrapeUrlE, city: string): Promise<SCRAPE_RESULT> {
    return this.processSearchOrOrganizerUrl(urlE, city);
  }

  private async processSearchOrOrganizerUrl(urlE: ScrapeUrlE, city: string): Promise<SCRAPE_RESULT> {
    if (this.checkIfUrlIsStale(urlE)) {
      return SCRAPE_RESULT.STALE;
    }

    const newEventUrls = await this.retrieveNewEventUrls(urlE);

    if (newEventUrls.length === 0) {
      return SCRAPE_RESULT.NO_NEW_EVENTS_FOUND;
    }

    const { numberOfSavedEvents } = await this.scrapeNewEventUrls(newEventUrls, city);

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

  private async scrapeNewEventUrls(eventUrls: string[], city: string): Promise<{ numberOfSavedEvents: number }> {
    const queue = [...eventUrls];
    const visitedUrls = new Set<string>();
    let numberOfSavedEvents = 0;

    while (queue.length > 0) {
      const eventUrl = queue.shift();

      if (eventUrl === undefined || visitedUrls.has(eventUrl)) {
        continue;
      }
      visitedUrls.add(eventUrl);

      const eventData = await this.scrapeEventData(eventUrl);
      if (!eventData) {
        await this.saveEventUrl(eventUrl, ScrapeUrlStatus.PROCESSED, city);
        continue;
      }

      const relevant = this.isEventRelevant(eventData);

      if (!relevant) {
        await this.saveEventUrl(eventUrl, ScrapeUrlStatus.NOT_RELEVANT, city);
        continue;
      }

      const organizerUrl = await this.scrapeOrganizerUrl(eventUrl);

      if (organizerUrl) {
        await this.ScrapeUrlManager.saveOrganizerUrl(organizerUrl, city);
      }

      // todo: it is very inefficient to scrape repeating Event URLs for every event
      // const repeatingEventUrls = await this.scrapeRepeatingEventUrls(eventUrl);

      // for (const repeatingEventUrl of repeatingEventUrls) {
      //   queue.push(repeatingEventUrl);
      // }

      const eventStart = new Date(eventData.startTimestamp * 1000);
      const inFuture = eventStart > this.TimeManager.getCurrentTime();

      if (!inFuture) {
        await this.saveEventUrl(eventUrl, ScrapeUrlStatus.IN_PAST, city, eventStart);
        continue;
      }

      try {
        await this.saveEvent(eventData);
      } catch (err) {
        console.error(`Error saving event ${eventUrl}:`, err);
      }

      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.PROCESSED, city, eventStart);

      numberOfSavedEvents++;
    }

    return { numberOfSavedEvents };
  }

  private async saveEventUrl(eventUrl: string, status: ScrapeUrlStatus, city: string, start?: Date) {
    await this.ScrapeUrlManager.saveEventUrl(eventUrl, city, start ?? null, status);
  }

  private checkIfUrlIsStale(searchUrlE: ScrapeUrlE) {
    const currentMoment = moment(this.TimeManager.getCurrentTime());
    const lastFoundMoment = moment(searchUrlE.lastFound ?? searchUrlE.createdAt);
    const daysSinceLastFound = currentMoment.diff(lastFoundMoment, 'days');
    const staleUrlExpiryDays = this.config.STALE_URL_EXPIRY_TIME_IN_DAYS;
    const lastScrape = moment(searchUrlE.lastScrape); // lastScrape is also set when scraping of url throws an error, thus we can be sure that lastScrape is not null for these urls
    const daysSinceLastScrape = currentMoment.diff(lastScrape, 'days');

    if (daysSinceLastFound >= staleUrlExpiryDays && daysSinceLastScrape < staleUrlExpiryDays) {
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
    if (positiveNameKeywords.some(keyword => name.includes(keyword))) return true;
    if (locationName && positiveNameKeywords.some(keyword => locationName.includes(keyword))) return true;

    const positiveDescriptionKeywords = ['salsa', 'kizomba', 'sabaki'];
    if (positiveDescriptionKeywords.some(keyword => desc.includes(keyword))) return true;

    if (desc.includes('bachata') && !desc.includes('reggaeton')) return true;

    return false;
  }

  async updateEvent(eventData: EventData) {
    const coordinates = await this.getEventCoordinates(eventData);
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.formatEventLocation(city, eventData);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);
    const oldEvent = await this.getEventByCoordinatesAndTime(eventReqBody);
    const { event_id } = await this.updateEventsAndVotes(oldEvent, eventReqBody, eventData.usersInterested);
    this.logEventAction('updated', event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async saveEvent(eventData: EventData) {
    const user_id = await get_user_id();
    const coordinates = await this.getEventCoordinates(eventData);
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.formatEventLocation(city, eventData);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);
    const { event_id } = await this.saveEventAndVotes(user_id, eventReqBody, eventData.usersInterested);
    this.logEventAction('saved', event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async getEventCoordinates(eventData: EventData): Promise<[number, number]> {
    if (eventData.location?.coordinates) {
      return [eventData.location.coordinates.longitude, eventData.location.coordinates.latitude];
    } else if (eventData.location) {
      return this.getCoordinatesByLocationName(eventData.location.name);
    } else {
      throw new Error(`Event does not have any location data.`);
    }
  }

  async getEventCity(eventData: EventData, coordinates: [number, number]): Promise<string> {
    if (eventData.location?.city?.name) {
      return eventData.location.city.name;
    }
    return this.getCityByCoordinates(coordinates[0], coordinates[1]);
  }

  async getCoordinatesByLocationName(location: string): Promise<[longitude: number, latitude: number]> {
    if (!process.env.GOOGLE_MAPS_API_KEY || typeof process.env.GOOGLE_MAPS_API_KEY !== 'string') {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined');
    }

    const client = new Client({});

    const response = await client.geocode({
      params: {
        address: location,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 1000,
    });

    const results = response.data.results;

    if (results.length > 0) {
      const loc = results[0].geometry.location;
      return [loc.lng, loc.lat];
    } else {
      throw new Error(`No coordinates found for ${location}.`);
    }
  }

  async getCityByCoordinates(longitude: number, latitude: number): Promise<string> {
    if (!process.env.GOOGLE_MAPS_API_KEY || typeof process.env.GOOGLE_MAPS_API_KEY !== 'string') {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined');
    }

    const client = new Client({});

    const response = await client.reverseGeocode({
      params: {
        latlng: {
          latitude,
          longitude,
        },
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 1000,
    });

    const results = response.data.results;

    if (results && results.length > 0) {
      for (const result of results) {
        for (const component of result.address_components) {
          if (component.types.includes(AddressType.locality)) {
            return component.long_name;
          }
        }
      }
    }
    throw new Error(`No city found for coordinates: ${latitude}, ${longitude}`);
  }

  private async getEventByCoordinatesAndTime(eventReqBody: EventReqBody): Promise<EventE> {
    const existing_event = await find_event_by_coordinates_and_time(eventReqBody.unix_time, eventReqBody.coordinates);
    if (!existing_event) throw new Error(`Event with the provided coordinates and time does not exist.`);
    return existing_event;
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
      image_url: eventData.photo?.imageUri,
      url: eventData.url,
    };
  }

  formatEventLocation(city: string, eventData: EventData): string {
    if (!eventData.location) throw new Error(`Event does not have any location data.`);

    if (!eventData.location?.name.includes(city)) {
      return `${city}, ${eventData.location?.name}`;
    }
    return eventData.location?.name;
  }

  async saveEventAndVotes(user_id: string, eventReqBody: EventReqBody, usersInterested: number): Promise<EventE> {
    // save event to get event_id
    const savedEvent1 = await save_event(null, user_id, eventReqBody);
    // save event to update image_url
    const EventRepo = await Database.get_repo(EventE);
    savedEvent1.image_url = await this.generateCloudinaryURL(savedEvent1.event_id, savedEvent1.image_url);
    const savedEvent2 = await EventRepo.save({ ...savedEvent1 });

    if (usersInterested > 0) await save_vote(savedEvent2.event_id, user_id, Votes.UP, usersInterested);

    return savedEvent2;
  }

  async updateEventsAndVotes(oldEvent: EventE, update: EventReqBody, usersInterested: number): Promise<EventE> {
    const { event_id, created_by: user_id, image_url } = oldEvent;
    const EventRepo = await Database.get_repo(EventE);
    const VoteRepo = await Database.get_repo(EventUpvoteE);

    const oldUsersInterested = await this.fetchOldVotes(VoteRepo, event_id);
    const diff = usersInterested - oldUsersInterested;

    if (diff > 0) {
      await this.updateVotes(VoteRepo, event_id, user_id, usersInterested);
      await this.updateEventStats(event_id, diff);
    }

    const eventDetails = await this.constructUpdateEvent(update, user_id);

    if (eventDetails.image_url && eventDetails.image_url !== image_url)
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

  async constructUpdateEvent(body: EventReqBody, user_id: string) {
    const { unix_time, title, description, location, locationUrl, coordinates, image_url, url, recurring_pattern } =
      body;

    const eventDetails: Partial<EventE> = {
      created_by: user_id,
      updated_by: user_id,
      unix_time,
      title,
      description: description ?? null,
      location,
      locationUrl,
      url: url ?? null,
      recurring_pattern: recurring_pattern ?? RecurringPattern.NONE,
    };

    if (image_url) {
      eventDetails.image_url = image_url;
    }

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

  async getNewEventUrlsViaSearch(searchUrl: string): Promise<string[]> {
    const eventUrls = await this.saveFetchEventUrlsFromSearchUrl(searchUrl);
    return this.filterNewEventUrls(eventUrls);
  }

  async getNewEventUrlsViaOrganizer(organizerUrl: string): Promise<string[]> {
    const eventUrls = await this.saveFetchEventUrlsFromOrganizerUrl(organizerUrl);
    return this.filterNewEventUrls(eventUrls);
  }

  async scrapeEventData(eventUrl: string): Promise<EventData | null> {
    const eventData = await this.saveFetchEventData(eventUrl);
    return eventData;
  }

  async scrapeOrganizerUrl(eventUrl: string): Promise<string | null> {
    const organizatorUrl = await this.saveFetchOrganizerUrlFromEventUrl(eventUrl);
    return organizatorUrl;
  }

  async scrapeRepeatingEventUrls(eventUrl: string): Promise<string[]> {
    const repeatingEventUrls = await this.saveFetchRepeatingEventURLsFromEvent(eventUrl);
    return repeatingEventUrls;
  }

  async saveFetchEventUrlsFromSearchUrl(searchUrl: string): Promise<string[]> {
    try {
      const res = await this.Scraper.fetchEventUrlsFromSearchUrl(searchUrl);
      this.errorCounter = 0;
      return res;
    } catch (err) {
      this.handleError();
      return [];
    }
  }

  async saveFetchEventUrlsFromOrganizerUrl(organizerUrl: string): Promise<string[]> {
    try {
      const res = await this.Scraper.fetchEventUrlsFromOrganizerUrl(organizerUrl);
      this.errorCounter = 0;
      return res;
    } catch (err) {
      console.error(`Error fetching URLs from organizer url ${organizerUrl}:`, err);
      this.handleError();
      return [];
    }
  }

  async saveFetchEventData(eventUrl: string): Promise<EventData | null> {
    try {
      const res = await this.Scraper.fetchEventData(eventUrl);
      this.errorCounter = 0;
      return res;
    } catch (err) {
      console.error(`Error fetching event data from Event URL ${eventUrl}:`, err);
      this.handleError();
      return null;
    }
  }

  async saveFetchRepeatingEventURLsFromEvent(eventUrl: string): Promise<string[]> {
    try {
      const res = await this.Scraper.fetchRepeatingEventURLsFromEvent(eventUrl);
      this.errorCounter = 0;
      return res;
    } catch (err) {
      console.error(`Error fetching repeating Event URLs from Event URL ${eventUrl}:`, err);
      this.handleError();
      return [];
    }
  }

  async saveFetchOrganizerUrlFromEventUrl(searchUrl: string): Promise<string | null> {
    try {
      const res = await this.Scraper.fetchOrganizerUrlFromEvent(searchUrl);
      this.errorCounter = 0;
      return res;
    } catch (err) {
      console.error(`Error fetching Organizer URL from Event URL ${searchUrl}:`, err);
      this.handleError();
      return null;
    }
  }

  private async filterNewEventUrls(eventUrls: string[]): Promise<string[]> {
    if (eventUrls.length === 0) {
      return [];
    }

    // Retrieve existing URLs from the database to compare
    const existingUrls = await this.ScrapeUrlManager.getScrapeUrls(eventUrls);

    // Create a set for faster lookup
    const existingUrlsSet = new Set(existingUrls.map(record => record.url));

    // Return URLs that don't already exist in the database
    return eventUrls.filter(url => !existingUrlsSet.has(url));
  }

  async createSearchUrlsIfNotExist(city: string) {
    const scrapeUrlsE: ScrapeUrlE[] = [];

    const searchUrls = this.generateSearchUrlsForCity(city);

    const existingSearchUrls = await this.ScrapeUrlManager.getScrapeUrls(searchUrls);

    if (existingSearchUrls.length > 0) return;

    for (const searchUrl of searchUrls) {
      const scrapeUrlE = await this.ScrapeUrlManager.saveSearchUrl(searchUrl, city);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      scrapeUrlsE.push(scrapeUrlE!);
    }
  }

  generateSearchUrlsForCity(city: string): string[] {
    const searchUrls = SEARCH_TERMS.map(term => `${BASE_URL}${encodeURIComponent(`${term} ${city}`)}`);

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

  handleError() {
    this.errorCounter++;
    console.error('Error occurred. Error counter:', this.errorCounter);
    if (this.errorCounter >= this.config.ERROR_THRESHOLD) {
      throw new Error(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
    }
  }
}
