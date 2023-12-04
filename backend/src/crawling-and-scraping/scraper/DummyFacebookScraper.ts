import { EventData } from 'facebook-event-scraper/dist/types';
import IFacebookScraper from './IFacebookScraper';
import moment from 'moment';
import { DummyFacebookScraperConfig } from '../../commons/enums';

export default class DummyFacebookScraper implements IFacebookScraper {
  private NO_EVENTS_FROM_SEARCH_URLS: boolean;
  private NO_EVENTS_FROM_ORGANIZER_URLS: boolean;
  private GENERATE_NEW_EVENT_URLS: boolean;
  private sampleEventData: EventData;
  private IS_THROWING_ERRORS: boolean;
  private IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME: boolean;
  private IS_RETURNING_IRRELEVANT_EVENTS: boolean;
  private EVENTS_ARE_MISSING_COORDINATES: boolean;
  private EVENTS_ARE_MISSING_CITY: boolean;
  private EVENTS_ARE_IN_ETTLINGEN: boolean;
  private i = 0;
  private j = 0;
  private k = 0;

  constructor(config?: DummyFacebookScraperConfig) {
    this.NO_EVENTS_FROM_SEARCH_URLS = config?.NO_EVENTS_FROM_SEARCH_URLS ?? false;
    this.NO_EVENTS_FROM_ORGANIZER_URLS = config?.NO_EVENTS_FROM_ORGANIZER_URLS ?? false;
    this.GENERATE_NEW_EVENT_URLS = config?.GENERATE_NEW_EVENT_URLS ?? false;
    this.IS_THROWING_ERRORS = config?.IS_THROWING_ERRORS ?? false;
    this.IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME = config?.IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME ?? false;
    this.IS_RETURNING_IRRELEVANT_EVENTS = config?.IS_RETURNING_IRRELEVANT_EVENTS ?? false;
    this.EVENTS_ARE_MISSING_COORDINATES = config?.EVENTS_ARE_MISSING_COORDINATES ?? false;
    this.EVENTS_ARE_MISSING_CITY = config?.EVENTS_ARE_MISSING_CITY ?? false;
    this.EVENTS_ARE_IN_ETTLINGEN = config?.EVENTS_ARE_IN_ETTLINGEN ?? false;

    const currentMoment = moment();
    const futureMoment = currentMoment.add(6, 'month');
    const futureTimestampInSeconds = futureMoment.unix();

    this.sampleEventData = {
      id: `event${++this.k}`,
      name: 'Sample Salsa Event',
      description: 'This is a mock salsa event description.',
      location: {
        name: 'Anna Lauter Straße 3, Karlsruhe, Germany',
        description: 'This is a sample location description.',
        url: 'https://example.com/location',
        coordinates: {
          latitude: 49.001991,
          longitude: 8.4149801,
        },
        countryCode: 'US',
        id: 'location123',
        type: 'PLACE',
        address: '123 Sample St, Sample City',
        city: {
          name: 'Karlsruhe',
          id: 'KarlsruheID',
        },
      },
      hosts: [
        {
          id: 'host1',
          name: 'Host 1',
          url: 'https://example.com/host1',
          type: 'User',
          photo: {
            imageUri: 'https://example.com/host1-photo.jpg',
          },
        },
        {
          id: 'host2',
          name: 'Host 2',
          url: 'https://example.com/host2',
          type: 'Page',
          photo: {
            imageUri: 'https://example.com/host2-photo.jpg',
          },
        },
      ],
      startTimestamp: futureTimestampInSeconds, // Unix timestamp for the event start time (2023-02-28T00:00:00Z)
      endTimestamp: null, // Set to null if there's no end time
      formattedDate: 'February 28, 2023, 00:00 AM - 11:59 PM',
      timezone: 'UTC',
      photo: {
        url: 'https://fastly.picsum.photos/id/237/200/300.jpg?hmac=TmmQSbShHz9CdQm0NkEjx1Dyh_Y984R9LpNrpvH2D_U',
        id: 'event-photo-123',
        imageUri: 'https://fastly.picsum.photos/id/237/200/300.jpg?hmac=TmmQSbShHz9CdQm0NkEjx1Dyh_Y984R9LpNrpvH2D_U',
      },
      video: null, // Set to null if there's no video
      url: 'https://example.com/eventX',
      isOnline: false, // Set to true if it's an online event
      onlineDetails: null, // Online event details (set to null for in-person events)
      ticketUrl: 'https://example.com/tickets', // Set to null if there are no tickets
      usersGoing: 200,
      usersInterested: 500,
    };

    if (this.IS_RETURNING_IRRELEVANT_EVENTS)
      this.sampleEventData = {
        ...this.sampleEventData,
        name: 'Sample Irrelevant Event',
        description: 'This is a mock irrelevant event description.',
      };

    if (this.EVENTS_ARE_MISSING_COORDINATES) this.sampleEventData.location!.coordinates = null;
    if (this.EVENTS_ARE_MISSING_CITY) this.sampleEventData.location!.city = null;
    if (this.EVENTS_ARE_IN_ETTLINGEN) {
      this.sampleEventData.location!.coordinates!.latitude = 48.9432;
      this.sampleEventData.location!.coordinates!.longitude = 8.398;
    }
  }

  throwErrorIfConfigured() {
    this.j++;
    if (this.IS_THROWING_ERRORS_50_PERCENT_OF_THE_TIME && this.j % 2 === 0) {
      throw new Error('Configured to throw errors sometimes.');
    }
    if (this.IS_THROWING_ERRORS) {
      throw new Error('Configured to throw errors.');
    }
  }

  async fetchEventUrlsFromSearchUrl(): Promise<string[]> {
    this.throwErrorIfConfigured();

    if (this.NO_EVENTS_FROM_SEARCH_URLS) return [];
    else if (this.GENERATE_NEW_EVENT_URLS) {
      return [`https://example.com/event${++this.i}`];
    } else return ['https://example.com/eventX', 'https://example.com/eventY'];
  }

  async fetchEventUrlsFromOrganizerUrl(): Promise<string[]> {
    this.throwErrorIfConfigured();

    if (this.NO_EVENTS_FROM_ORGANIZER_URLS) return [];
    else return ['https://example.com/organizerEventX', 'https://example.com/organizerEventY'];
  }

  async fetchRepeatingEventURLsFromEvent(): Promise<string[]> {
    this.throwErrorIfConfigured();

    return [
      'https://example.com/eventX',
      'https://example.com/eventY',
      'https://example.com/repeatingEvent1',
      'https://example.com/repeatingEvent2',
    ];
  }

  async fetchOrganizerUrlFromEvent(): Promise<string> {
    this.throwErrorIfConfigured();

    return 'https://example.com/organizer';
  }

  async fetchEventData(): Promise<EventData> {
    this.throwErrorIfConfigured();
    this.sampleEventData.id = `event${++this.k}`;
    return this.sampleEventData;
  }

  updateSampleEventData(updates: Partial<EventData>): void {
    Object.keys(updates).forEach(key => {
      const updateValue = updates[key as keyof EventData];

      if (updateValue !== undefined) {
        this.sampleEventData[key] = updateValue;
      }
    });
  }
}
