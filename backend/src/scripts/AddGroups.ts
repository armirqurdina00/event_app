import { config as dotenvConfig } from 'dotenv';
import axios from 'axios';
import { readFileSync } from 'fs';
import { BackendClient, GroupReqBody } from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';

dotenvConfig({ path: `${__dirname}/../../.env/.prod_env` });

const inviteURLFilePath = __dirname + '/../../../frontend/telegramInviteURLs.json';
let backend_client: BackendClient;
let user_id;

interface CityData {
  city: string;
  latitude: number;
  longitude: number;
  googleMapsLink: string;
}

describe('Add Telegram Groups.', function () {
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

  it('Add Telegram Groups via POST /v1/users/{user_id}/groups', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
    const jsonData = readFileSync(inviteURLFilePath, 'utf-8');
    const inviteURLs = JSON.parse(jsonData);

    const cities = Object.keys(inviteURLs);
    try {
      const cityDataArray = await getCityData(cities);
      await createGroups(cityDataArray, inviteURLs);
    } catch (error) {
      console.error('Error in adding groups:', error);
    }
  });
});

async function getCityData(cities: string[]): Promise<CityData[]> {
  const cityDataPromises = cities.map(city => getCityDatum(city));
  const cityDataArray = await Promise.all(cityDataPromises);
  const result = cityDataArray.filter(Boolean) as CityData[];
  return result;
}

async function getCityDatum(city: string): Promise<CityData | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  try {
    const { data } = await axios.get(url);
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        city,
        latitude: location.lat,
        longitude: location.lng,
        googleMapsLink: `https://www.google.com/maps/?q=${location.lat},${location.lng}`,
      };
    } else {
      console.warn(`No results for ${city}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching data for ${city}:`, error);
    throw error;
  }
}

async function createGroups(cityDataArray: CityData[], inviteURLs: Record<string, string>): Promise<void> {
  const groupPromises = cityDataArray.map(async cityData => {
    const { city } = cityData;
    const title = `${city} • sabaki.dance`;

    try {
      const existingGroup = await backend_client.groups.getGroups(1, 10, undefined, undefined, undefined, title);
      if (existingGroup.items?.length > 0) {
        console.log(`Group with title ${title} already exists.`);
        return;
      }

      const body: GroupReqBody = {
        title,
        description: `Join us to discover and share events, music, and information about Salsa, Bachata, and Kizomba in and around ${city}! Everyone from curious beginners to seasoned dancers is welcome! 🎶💃🕺`,
        link: inviteURLs[city] ?? '',
        location: city,
        locationUrl: cityData.googleMapsLink ?? '',
        coordinates: {
          latitude: cityData.latitude,
          longitude: cityData.longitude,
        },
      };

      await backend_client.groups.postGroups(user_id, body);
      console.log(`Group ${title} created successfully.`);
    } catch (error) {
      console.error(`Error processing group for ${city}:`, error);
    }
  });

  await Promise.all(groupPromises);
}
