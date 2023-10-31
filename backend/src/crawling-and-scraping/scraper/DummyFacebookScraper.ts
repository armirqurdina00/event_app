import { EventData } from 'facebook-event-scraper/dist/types';
import IFacebookScraper from './IFacebookScraper';
import moment from 'moment';
import { DummyFacebookScraperConfig, FacebookCrawlerConfig } from '../../commons/enums';

export default class DummyFacebookScraper implements IFacebookScraper {
  private NO_EVENTS_FROM_SEARCH_URLS: boolean
  private NO_EVENTS_FROM_ORGANIZER_URLS: boolean
  private GENERATE_NEW_EVENT_URLS: boolean
  private sampleEventData: EventData
  private i = 0

  constructor(config?: DummyFacebookScraperConfig) {
    this.NO_EVENTS_FROM_SEARCH_URLS = config?.NO_EVENTS_FROM_SEARCH_URLS ?? false;
    this.NO_EVENTS_FROM_ORGANIZER_URLS = config?.NO_EVENTS_FROM_ORGANIZER_URLS ?? false;
    this.GENERATE_NEW_EVENT_URLS = config?.GENERATE_NEW_EVENT_URLS ?? false;

    const currentMoment = moment();
    const futureMoment = currentMoment.add(1, 'week');
    const futureTimestampInSeconds = futureMoment.unix();

    this.sampleEventData = {
      id: 'event123',
      name: 'Sample Event',
      description: 'This is a mock salsa event description.',
      location: {
        name: 'Sample Location',
        description: 'This is a sample location description.',
        url: 'https://example.com/location',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
        countryCode: 'US',
        id: 'location123',
        type: 'PLACE',
        address: '123 Sample St, Sample City',
        city: {
          name: 'Sample City',
          id: 'city123',
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
  }

  async fetchOtherEventURLsFromEvent(url: string): Promise<string[]> {
    return ['https://example.com/otherEvent1', 'https://example.com/otherEvent2'];
  }

  setConfig(config: DummyFacebookScraperConfig) {
    if (config?.NO_EVENTS_FROM_SEARCH_URLS !== undefined)
      this.NO_EVENTS_FROM_SEARCH_URLS = config?.NO_EVENTS_FROM_SEARCH_URLS;
    if (config?.NO_EVENTS_FROM_ORGANIZER_URLS !== undefined)
      this.NO_EVENTS_FROM_ORGANIZER_URLS = config?.NO_EVENTS_FROM_ORGANIZER_URLS;
    if (config?.GENERATE_NEW_EVENT_URLS !== undefined)
      this.GENERATE_NEW_EVENT_URLS = config?.GENERATE_NEW_EVENT_URLS;
  }

  async fetchEventUrlsFromSearchUrl(url: string): Promise<string[]> {
    if (this.NO_EVENTS_FROM_SEARCH_URLS)
      return [];
    else if (this.GENERATE_NEW_EVENT_URLS) {
      return [`https://example.com/event${++this.i}`];
    }
    else
      return ['https://example.com/eventX', 'https://example.com/eventY'];
  }

  async fetchEventUrlsFromOrganizerUrl(url: string): Promise<string[]> {
    if (this.NO_EVENTS_FROM_ORGANIZER_URLS)
      return [];
    else
      return ['https://example.com/organizerEventX', 'https://example.com/organizerEventY'];
  }

  async fetchOrganizerUrlFromEvent(url: string): Promise<string> {
    return 'https://example.com/organizer';
  }

  async fetchEventData(url: string): Promise<EventData> {
    return this.sampleEventData;
  }

  updateSampleEventData(updates: Partial<EventData>): void {
    Object.keys(updates).forEach((key) => {
      const updateValue = updates[key as keyof EventData];

      if (updateValue !== undefined) {
        this.sampleEventData[key] = updateValue;
      }
    });
  }
}
