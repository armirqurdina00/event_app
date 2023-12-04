import { EventE, GroupE, ScrapeUrlE } from '../../commons/typeorm_entities';
import { FacebookCrawlerConfig, SCRAPE_RESULT, ScrapeUrlStatus, UrlType } from '../../commons/enums';
import { EventData } from 'facebook-event-scraper/dist/types';
import { EventReqBody, RecurringPattern } from '../../helpers-for-tests/backend_client';
import { get_user_id } from '../../helpers-for-tests/auth';
import IFacebookCrawler from './IFacebookCrawler';
import IFacebookScraper from '../scraper/IFacebookScraper';
import { v2 as cloudinary } from 'cloudinary';
import TimeManager from './TimeManager';
import ScrapeUrlManager from './ScrapeUrlManager';
import moment from 'moment';
import { ERROR_THRESHOLD_EXCEEDED_MESSAGE } from '../../commons/constants';
import { EventsService } from '../../services/EventsService';
import { LocationsService } from '../../services/LocationsService';
import { Coordinates, CoordinatesRes } from '../../commons/TsoaTypes';
import { GroupsService } from '../../services/GroupsService';
import { DataSource } from 'typeorm';

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

export default class FacebookCrawler implements IFacebookCrawler {
  private config: FacebookCrawlerConfig;
  private eventsService: EventsService;
  private locationsService: LocationsService;
  private groupsService: GroupsService;
  private errorCounter: { [key: string]: number };
  public dataSource: DataSource;
  public scraper: IFacebookScraper;
  public timeManager: TimeManager;
  public scrapeUrlManager: ScrapeUrlManager;

  constructor(
    dataSource: DataSource,
    scraper: IFacebookScraper,
    ScrapeUrlManager: ScrapeUrlManager,
    TimeManager: TimeManager,
    config: FacebookCrawlerConfig
  ) {
    this.scraper = scraper;
    this.config = config;
    this.timeManager = TimeManager;
    this.scrapeUrlManager = ScrapeUrlManager;
    this.errorCounter = {};
    this.dataSource = dataSource;
    this.eventsService = new EventsService(dataSource);
    this.locationsService = new LocationsService(dataSource);
    this.groupsService = new GroupsService(dataSource);
  }

  public async run() {
    const citiesToScrape = await this.fetchCitiesToBeScraped();
    for (const city of citiesToScrape) {
      await this.scrapeEventsViaSearch(city);
      await this.scrapeEventsViaOrganizer(city);
      await this.scrapeOldEvents(city);
    }
  }

  async fetchCitiesToBeScraped(): Promise<string[]> {
    let cities = await this.dataSource
      .getRepository(GroupE)
      .createQueryBuilder('group')
      .select('group.location AS city')
      .addSelect('SUM(group.number_of_joins) AS joinCount')
      .groupBy('group.location')
      .orderBy('joinCount', 'DESC')
      .getRawMany();

    cities = cities.map(e => e.city);

    return cities;
  }

  public async scrapeEventsViaSearch(city: string) {
    console.info(`Start scraping via search for city: ${city}`);

    await this.createSearchUrlsIfNotExist(city);
    const searchUrlsE = await this.scrapeUrlManager.getNextScrapeUrls(city, UrlType.SEARCH_URL);

    for (const searchUrlE of searchUrlsE) {
      console.info('Processing search url: ', searchUrlE.url);
      const scrapeResult = await this.processSearchUrl(searchUrlE, city);
      await this.scrapeUrlManager.updateSearchUrl(searchUrlE.url, scrapeResult);
    }

    console.info(`Finished scraping via search for city: ${city}`);
  }

  public async scrapeEventsViaOrganizer(city: string) {
    console.info(`Start scraping via organizer for city: ${city}`);

    const organizerUrlsE = await this.scrapeUrlManager.getNextScrapeUrls(city, UrlType.ORGANIZER_URL);

    for (const organizerUrlE of organizerUrlsE) {
      console.info('Processing organizer url: ', organizerUrlE.url);
      const scrapeResult = await this.processOrganizerUrl(organizerUrlE, city);
      await this.scrapeUrlManager.updateOrganizerUrl(organizerUrlE.url, scrapeResult);
    }

    console.info(`Finished scraping via organizer for city: ${city}`);
  }

  public async scrapeOldEvents(city: string) {
    console.info(`Start updating events for city: ${city}`);

    await this.scrapeUrlManager.updateAllExpiredEventUrlStatus(city);
    const eventUrlsE = await this.scrapeUrlManager.getNextScrapeUrls(city, UrlType.EVENT_URL);
    const eventUrls = eventUrlsE.map(eventUrlE => eventUrlE.url);

    for (const eventUrl of eventUrls) {
      try {
        console.info('Processing old event url: ', eventUrl);
        await this.processOldEvent(eventUrl);
      } catch (err) {
        this.handleScrapeNewEventUrlError(err, eventUrl);
      }
    }

    console.info(`Finished updating events for city: ${city}`);
  }

  private async processOldEvent(eventUrl: string) {
    const eventData = await this.scrapeEventData(eventUrl);
    if (eventData === null) {
      await this.scrapeUrlManager.updateEventUrl(eventUrl, ScrapeUrlStatus.FAILED_TO_SCRAPE);
      return;
    }

    const eventStart = new Date(eventData.startTimestamp * 1000);

    await this.updateEvent(eventData);

    await this.scrapeUrlManager.updateEventUrl(eventUrl, ScrapeUrlStatus.PROCESSED, eventStart);
  }

  private async scrapeNewEvents(eventUrls: string[], city: string): Promise<{ numberOfSavedEvents: number }> {
    let numberOfSavedEvents = 0;

    for (const eventUrl of eventUrls) {
      try {
        if (await this.processNewEvent(eventUrl, city)) {
          numberOfSavedEvents++;
        }
      } catch (err) {
        this.handleScrapeNewEventUrlError(err, eventUrl);
      }
    }

    return { numberOfSavedEvents };
  }

  private async processNewEvent(eventUrl: string, city: string): Promise<boolean> {
    const eventData = await this.scrapeEventData(eventUrl);
    if (eventData === null) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.FIRST_TIME_FAILED_TO_SCRAPE, city);
      return false;
    }

    if (!this.isEventRelevant(eventData)) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.NOT_RELEVANT, city);
      return false;
    }

    await this.trySaveOrganizerUrl(eventUrl, city);

    const eventStart = new Date(eventData.startTimestamp * 1000);

    if (this.isEventInPast(eventData)) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.IN_PAST, city, eventStart);
      return false;
    }

    if (eventData.location === null) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.MISSING_LOCATION, city, eventStart);
      return false;
    }

    const coordinates = await this.tryGetEventCoordinates(eventData);
    if (coordinates === null) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.MISSING_COORDINATES, city, eventStart);
      return false;
    }

    if (!(await this.isEventInGroupProximity(coordinates, this.config.EVENT_GROUP_PROXIMITY_DISTANCE_IN_KM))) {
      await this.saveEventUrl(eventUrl, ScrapeUrlStatus.OUTSIDE_GROUP_PROXIMITY, city);
      return false;
    }

    await this.saveEvent(eventData, coordinates);
    await this.saveEventUrl(eventUrl, ScrapeUrlStatus.PROCESSED, city, new Date(eventData.startTimestamp * 1000));

    return true;
  }

  private async trySaveOrganizerUrl(eventUrl: string, city: string) {
    const organizerUrl = await this.scrapeOrganizerUrl(eventUrl);
    if (organizerUrl) {
      await this.scrapeUrlManager.saveOrganizerUrl(organizerUrl, city);
    }
  }

  private async tryGetEventCoordinates(eventData: any): Promise<Coordinates | null> {
    try {
      return await this.getEventCoordinates(eventData);
    } catch (err) {
      return null;
    }
  }

  private isEventInPast(eventData: any): boolean {
    return new Date(eventData.startTimestamp * 1000) < this.timeManager.getCurrentTime();
  }

  private async saveEventUrl(eventUrl: string, status: ScrapeUrlStatus, city: string, start?: Date) {
    await this.scrapeUrlManager.saveEventUrl(eventUrl, city, status, start);
  }

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

    const { numberOfSavedEvents } = await this.scrapeNewEvents(newEventUrls, city);

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

  private checkIfUrlIsStale(searchUrlE: ScrapeUrlE) {
    if (searchUrlE.lastScrape === null) return false;

    const currentMoment = moment(this.timeManager.getCurrentTime());
    const lastFoundMoment = moment(searchUrlE.lastFound ?? searchUrlE.createdAt);
    const daysSinceLastFound = currentMoment.diff(lastFoundMoment, 'days');
    const staleUrlExpiryDays = this.config.STALE_URL_EXPIRY_TIME_IN_DAYS;
    const lastScrape = moment(searchUrlE.lastScrape);
    const daysSinceLastScrape = currentMoment.diff(lastScrape, 'days');

    if (daysSinceLastFound >= staleUrlExpiryDays && daysSinceLastScrape < staleUrlExpiryDays) {
      return true;
    } else {
      return false;
    }
  }

  isEventRelevant(eventData: EventData) {
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

  async isEventInGroupProximity(coordinates: Coordinates, distance: number) {
    const { latitude, longitude } = coordinates;
    const groupService = await this.groupsService;
    const groupsNearby = await groupService.get_groups(1, 1, latitude, longitude, distance);

    if (groupsNearby.items.length > 0) return true;
    else return false;
  }

  async updateEvent(eventData: EventData) {
    const coordinates = await this.getEventCoordinates(eventData);
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.formatEventLocation(city, eventData);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);
    const oldEvent = await this.getEventByCoordinatesAndTime(eventReqBody);
    const { event_id } = await this.updateEventAndInterests(oldEvent, eventReqBody, eventData.usersInterested);
    this.logEventAction('updated', event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async saveEvent(eventData: EventData, coordinates: Coordinates) {
    const user_id = await get_user_id();
    const city = await this.getEventCity(eventData, coordinates);
    const location = this.formatEventLocation(city, eventData);
    const eventReqBody = this.createEventRequestBody(eventData, coordinates, location);
    const { event_id } = await this.saveEventAndInterests(user_id, eventReqBody, eventData.usersInterested);
    this.logEventAction('saved', event_id, eventData.name, eventReqBody.unix_time, location);
  }

  async getEventCoordinates(eventData: EventData): Promise<Coordinates> {
    if (eventData.location?.coordinates) {
      return {
        latitude: eventData.location.coordinates.latitude,
        longitude: eventData.location.coordinates.longitude,
      };
    } else if (eventData.location) {
      const coordsRes: CoordinatesRes = await (await this.locationsService).getCoordinates(eventData.location.name);
      return {
        latitude: coordsRes.latitude,
        longitude: coordsRes.longitude,
      };
    } else {
      throw new Error(`Event does not have any location data.`);
    }
  }

  async getEventCity(eventData: EventData, coordinates: Coordinates): Promise<string> {
    if (eventData.location?.city?.name) {
      return eventData.location.city.name;
    }
    const cityRes = await (await this.locationsService).getCity(coordinates);
    return cityRes.name;
  }

  private async getEventByCoordinatesAndTime(eventReqBody: EventReqBody): Promise<EventE> {
    const existing_event = await (
      await this.eventsService
    ).find_event_by_coordinates_and_time(eventReqBody.unix_time, eventReqBody.coordinates);
    if (!existing_event) throw new Error(`Event with the provided coordinates and time does not exist.`);
    return existing_event;
  }

  createEventRequestBody(eventData: EventData, coordinates: Coordinates, location: string): EventReqBody {
    return {
      unix_time: eventData.startTimestamp * 1000,
      recurring_pattern: RecurringPattern.NONE,
      title: eventData.name,
      description: eventData.description,
      location,
      locationUrl: `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`,
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

  async saveEventAndInterests(user_id: string, eventReqBody: EventReqBody, usersInterested: number): Promise<EventE> {
    // save event to get event_id
    const savedEvent1 = await (await this.eventsService).save_event(null, user_id, eventReqBody);
    // save event to update image_url
    const eventRepo = this.dataSource.getRepository(EventE);
    // todo: move image generation up to saveEvent function
    savedEvent1.image_url = await this.generateCloudinaryURL(savedEvent1.event_id, savedEvent1.image_url);
    const savedEvent2 = await eventRepo.save({ ...savedEvent1 });

    if (usersInterested > 0) await (await this.eventsService).incrementEventInterests(savedEvent2, usersInterested);

    return savedEvent2;
  }

  async updateEventAndInterests(oldEvent: EventE, update: EventReqBody, usersInterested: number): Promise<EventE> {
    const { event_id, created_by: user_id, image_url } = oldEvent;
    const eventRepo = this.dataSource.getRepository(EventE);

    const oldUsersInterested = oldEvent.votes_diff;
    const diff = usersInterested - oldUsersInterested;

    if (diff > 0) {
      await (await this.eventsService).incrementEventInterests(oldEvent, diff);
    }

    const eventDetails = await this.constructUpdateEvent(update, user_id);

    // todo: move image generation up to updateEvent function
    if (eventDetails.image_url && eventDetails.image_url !== image_url)
      eventDetails.image_url = await this.generateCloudinaryURL(event_id, eventDetails.image_url);

    const updatedEvent = await eventRepo.save({ event_id, ...eventDetails });

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
      eventDetails.location_point = { type: 'Point', coordinates: [coordinates.longitude, coordinates.latitude] };
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
    const functionName = 'fetchEventUrlsFromSearchUrl';
    try {
      const res = await this.scraper[functionName](searchUrl);
      this.resetErrorCounter(functionName);
      return res;
    } catch (err) {
      this.handleScrapeError(functionName);
      return [];
    }
  }

  async saveFetchEventUrlsFromOrganizerUrl(organizerUrl: string): Promise<string[]> {
    const functionName = 'fetchEventUrlsFromOrganizerUrl';
    try {
      const res = await this.scraper[functionName](organizerUrl);
      this.resetErrorCounter(functionName);
      return res;
    } catch (err) {
      console.error(`Error fetching URLs from organizer url ${organizerUrl}:`, err);
      this.handleScrapeError(functionName);
      return [];
    }
  }

  async saveFetchEventData(eventUrl: string): Promise<EventData | null> {
    const functionName = 'fetchEventData';
    try {
      const res = await this.scraper[functionName](eventUrl);
      this.resetErrorCounter(functionName);
      return res;
    } catch (err) {
      console.error(`Error fetching event data from Event URL ${eventUrl}:`, err);
      this.handleScrapeError(functionName);
      return null;
    }
  }

  async saveFetchRepeatingEventURLsFromEvent(eventUrl: string): Promise<string[]> {
    const functionName = 'fetchRepeatingEventURLsFromEvent';
    try {
      const res = await this.scraper[functionName](eventUrl);
      this.resetErrorCounter(functionName);
      return res;
    } catch (err) {
      console.error(`Error fetching repeating Event URLs from Event URL ${eventUrl}:`, err);
      this.handleScrapeError(functionName);
      return [];
    }
  }

  async saveFetchOrganizerUrlFromEventUrl(searchUrl: string): Promise<string | null> {
    const functionName = 'fetchOrganizerUrlFromEvent';
    try {
      const res = await this.scraper[functionName](searchUrl);
      this.resetErrorCounter(functionName);
      return res;
    } catch (err) {
      console.error(`Error fetching Organizer URL from Event URL ${searchUrl}:`, err);
      this.handleScrapeError(functionName);
      return null;
    }
  }

  private async filterNewEventUrls(eventUrls: string[]): Promise<string[]> {
    if (eventUrls.length === 0) {
      return [];
    }

    // Retrieve existing URLs from the database to compare
    const existingUrls = await this.scrapeUrlManager.getScrapeUrls(eventUrls);

    // Create a set for faster lookup
    const existingUrlsSet = new Set(existingUrls.map(record => record.url));

    // Return URLs that don't already exist in the database
    return eventUrls.filter(url => !existingUrlsSet.has(url));
  }

  async createSearchUrlsIfNotExist(city: string) {
    const scrapeUrlsE: ScrapeUrlE[] = [];

    const searchUrls = this.generateSearchUrlsForCity(city);

    const existingSearchUrls = await this.scrapeUrlManager.getScrapeUrls(searchUrls);

    if (existingSearchUrls.length > 0) return;

    for (const searchUrl of searchUrls) {
      const scrapeUrlE = await this.scrapeUrlManager.saveSearchUrl(searchUrl, city);
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

  private handleScrapeNewEventUrlError(err: unknown, eventUrl: string): void {
    if (this.isErrorThresholdExceeded(err)) {
      throw err;
    }

    console.error(`Error processing event URL ${eventUrl}:`, this.formatErrorMessage(err));
  }

  private isErrorThresholdExceeded(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      (err as { message: string }).message === ERROR_THRESHOLD_EXCEEDED_MESSAGE
    );
  }

  private formatErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const message = (err as Error).message || 'Unknown error occurred';
      return `Error: ${message}`;
    }
    return 'An unexpected error occurred';
  }

  /* Facebook's throttling is not consistent, so we need to keep track of the number of errors for each function. Currently, especially the 'fetchEventUrlsFromOrganizerUrl' function is prone to getting throttled. */
  handleScrapeError(functionName: string) {
    const errorCount = this.incrementErrorCounter(functionName);
    console.info(`Error count for ${functionName}: ${errorCount}. Error threshold: ${this.config.ERROR_THRESHOLD}.`);
    if (errorCount >= this.config.ERROR_THRESHOLD) {
      throw new Error(ERROR_THRESHOLD_EXCEEDED_MESSAGE);
    }
  }

  incrementErrorCounter(functionName: string) {
    this.errorCounter[functionName] = (this.errorCounter[functionName] || 0) + 1;
    return this.errorCounter[functionName];
  }

  resetErrorCounter(functionName: string) {
    this.errorCounter[functionName] = 0;
  }
}
