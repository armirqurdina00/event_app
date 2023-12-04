import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: `${__dirname}/../../.env/.prod_env` });

import axios, { AxiosResponse } from 'axios';
import { readFileSync } from 'fs';
import { BackendClient, EventReqBody } from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';
import { GroupE } from '../commons/typeorm_entities';
import { dataSource } from '../helpers';
import { Coordinates } from '../commons/TsoaTypes';

const eventsFilePath = __dirname + '/../../../scraping/european_events_from_latindancecalendar.json';
let backend_client: BackendClient;
let user_id: string;

describe('Add Events.', function () {
  before(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const server = require('../index').default;
    await server;

    backend_client = new BackendClient({
      BASE: process.env.BU_API_URL,
      TOKEN: get_access_token,
    });

    user_id = await get_user_id();
  });

  it.skip('debug', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 10000);

    const response = await getEventsFromAllEventsIn('salsa', 'Munich', 11.5819806, 48.1351253);

    const events: Event[] = response.data?.events;

    console.log('first three events');
    console.log(events[0].eventname);
    console.log(events[1].eventname);
    console.log(events[2].eventname);
  });

  it('Scrape and Add Events from https://allevents.in', async function () {
    this.timeout(60 * 60 * 1000);

    const groupLocations = await getMostPopularGroupLocations(200);

    for (const i in groupLocations) {
      for (const query of ['salsa', 'bachata', 'kizomba']) {
        const [longitude, latitude] = groupLocations[i].location_point.coordinates;

        try {
          const response = await getEventsFromAllEventsIn(query, groupLocations[i].location, longitude, latitude);
          const events: Event[] = response.data?.events;

          for (const event of events) {
            const address = `${event.venue.city}, ${event.venue.full_address}`;
            const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            const coordinates: Coordinates = {
              latitude: event.venue.latitude,
              longitude: event.venue.longitude,
            };
            const imageUrl = event.banner_url || event.thumb_url_large || event.thumb_url;

            const eventData: EventReqBody = {
              unix_time: event.start_time * 1000, // Convert seconds to milliseconds
              title: event.eventname,
              location: address,
              locationUrl: link,
              coordinates: coordinates,
              image_url: imageUrl,
            };

            try {
              await backend_client.events.postEvent(user_id, eventData);
            } catch (error: any) {
              if (error.status === 400) {
                console.error(`Event already exists: ${eventData.title}`);
              } else {
                console.error(`Error processing event ${eventData.title}:`, error);
              }
            }
          }
        } catch (error) {
          console.error(`Error retrieving events for ${groupLocations[i].location}:`, error);
        }
      }
    }
  });

  it.skip('Add Events via POST /v1/users/{user_id}/events from file', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
    const jsonData = readFileSync(eventsFilePath, 'utf-8');
    const allEventsData: EventReqBody[] = JSON.parse(jsonData);

    // // Here, we are taking the first two events only. For debugging
    // const firstTwoEventsData = allEventsData.slice(700, 750);

    try {
      await createEvents(allEventsData);
    } catch (error: any) {
      console.error('Error in adding events:', error);
      throw error;
    }
  });
});

// scrape events

type ResponseData = {
  message: string;
  error: number;
  request: RequestDetails;
  rows: number;
  is_less_category: boolean;
  suggestion: any[]; // Adjust if you have more specifics about the suggestion array
  events: Event[];
};

type RequestDetails = {
  query: string;
  latitude: string;
  longitude: string;
  city: string;
  timestamp: number;
};

type Event = {
  event_id: string;
  eventname: string;
  thumb_url: string;
  thumb_url_large: string;
  banner_url: string;
  start_time: number;
  start_time_display: string;
  location: string;
  venue: Venue;
  label: string;
  featured: number;
  event_url: string;
  share_url: string;
  object_type: string;
  end_url: string;
  distance: number;
  ticket: TicketDetails;
  recurring_event_details: RecurringEventDetails;
};

type Venue = {
  street: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  full_address: string;
};

type TicketDetails = {
  has_tickets: boolean;
};

type RecurringEventDetails = {
  has_slots: boolean;
};

async function getMostPopularGroupLocations(limit: number) {
  if (!dataSource.isInitialized) await dataSource.initialize();

  const groupRepo = dataSource.getRepository(GroupE);

  const rawGroupLocations = await groupRepo
    .createQueryBuilder('group')
    .select(['ST_AsGeoJSON(group.location_point) as location_point', 'group.location']) // Using ST_AsGeoJSON
    .addSelect('SUM(group.number_of_joins)', 'total_joins')
    .groupBy('group.location_point')
    .addGroupBy('group.location')
    .orderBy('total_joins', 'DESC')
    .offset(20)
    .limit(limit)
    .getRawMany();

  const groupLocations = rawGroupLocations.map(group => ({
    location_point: JSON.parse(group.location_point),
    location: group.group_location,
    total_joins: group.total_joins,
  }));

  return groupLocations;
}

async function getEventsFromAllEventsIn(
  query: string,
  city: string,
  longitude: number,
  latitude: number
): Promise<AxiosResponse<ResponseData>> {
  const url = 'https://allevents.in/api/index.php/events/web/qs/search';

  // Define the request headers
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json;charset=UTF-8',
    Origin: 'https://allevents.in',
    Pragma: 'no-cache',
    Referer: 'https://allevents.in/karlsruhe?ref=home-page',
    'Sec-Ch-Ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    Cookie: '_pk_id.1.6c4e=5abaaa3f561b73ae.1693208321.; WZRK_G=95c109b232654d118a602d89df18e6c7; ...', // Shortened for brevity
  };

  // Define the request payload
  const data = {
    query,
    city,
    latitude,
    longitude,
  };

  // const data_1 = {
  //   'query': 'salsa',
  //   'latitude': '49.0020669',
  //   'longitude': '8.4150141'
  // };

  // const data_2 = { 'query':'salsa','latitude':'49.002061','longitude':'8.4150049','city':'Frankfurt','country':'Germany','region_code':'HE' };

  // const data_3 = { 'query':'salsa','latitude':'49.002061','longitude':'8.4150049','city':'Freiburg Im Breisgau','country':'Germany','region_code':'BW' };

  try {
    const response = await axios.post<any, AxiosResponse<ResponseData>>(url, data, { headers: headers });
    return response;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

// create events
async function createEvents(eventsData: EventReqBody[]): Promise<void> {
  const eventPromises = eventsData.map(async eventData => {
    try {
      const existingEvent = await backend_client.events.getEvents(
        1,
        10,
        undefined,
        undefined,
        undefined,
        eventData.title
      );
      if (existingEvent.items?.length > 0) {
        console.log(`Event with title ${eventData.title} already exists.`);
        return;
      }

      // Get coordinates for the event location
      const coordinates = await getLocationCoordinates(eventData.location);

      const body: EventReqBody = {
        ...eventData,
        coordinates,
        unix_time: eventData.unix_time * 1000,
      };

      await backend_client.events.postEvent(user_id, body);
      console.log(`Event ${eventData.title} created successfully.`);
    } catch (error: any) {
      if (error.status === 400) {
        return;
      }
      console.error(`Error processing event ${eventData.title}:`, error);
      throw error;
    }
  });

  await Promise.all(eventPromises);
}

async function getLocationCoordinates(location: string): Promise<Coordinates> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${
    process.env.GOOGLE_MAPS_API_KEY
  }`;
  try {
    const { data } = await axios.get(url);
    if (data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return {
        latitude: loc.lat,
        longitude: loc.lng,
      };
    } else {
      console.warn(`No results for ${location}`);
      return {
        latitude: 0,
        longitude: 0,
      };
    }
  } catch (error) {
    console.error(`Error fetching coordinates for ${location}:`, error);
    throw error;
  }
}

async function getAddressAndLinkFromCoordinates(lat: number, lng: number): Promise<{ address: string; link: string }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  try {
    const { data } = await axios.get(url);

    let city = 'Unknown City';
    let street = 'Unknown Street';
    let number = 'Unknown Number';

    if (data.results && data.results.length > 0) {
      const addressComponents = data.results[0].address_components;

      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('route')) {
          street = component.long_name;
        }
        if (component.types.includes('street_number')) {
          number = component.long_name;
        }
      }
    } else {
      console.warn(`No results for coordinates: ${lat}, ${lng}`);
    }

    const fullAddress = `${city}, ${street} ${number}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    return {
      address: fullAddress,
      link: `https://www.google.com/maps/place/${encodedAddress}`,
    };
  } catch (error) {
    console.error(`Error fetching address details for coordinates ${lat}, ${lng}:`, error);
    throw error;
  }
}

function formatAddress(address) {
  const parts = address.split(',');
  let result = '';

  // Check for city
  if (parts.length >= 3) {
    result += parts[2].trim();
  }

  // Check for name or place
  if (parts[0]) {
    result += ', ' + parts[0].trim();
  }

  // Check for street and street number
  if (parts.length >= 2) {
    result += ', ' + parts[1].trim();
  }

  // Check for extra parts (for some addresses)
  if (parts.length > 3) {
    for (let i = 3; i < parts.length; i++) {
      result += ', ' + parts[i].trim();
    }
  }

  return result;
}
