import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import { BackendClient } from '../helpers-for-tests/backend_client';
import { dataSource } from '../helpers';
import { CITY_RADIUS_IN_METERS } from '../services/LocationsService';
import { startServer, stopServer } from '../server';
import { NodeEnv } from '../commons/enums';

const backendClient = new BackendClient({
  BASE: process.env.BU_API_URL,
});

describe('Tests for locations endpoints.', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
  before(async function () {
    if (process.env.NODE_ENV === NodeEnv.development) {
      await startServer();
    }

    await dataSource.query('DELETE FROM location_e;');
  });

  after(async function () {
    console.log('Stopping server from location tests ...');
    await stopServer();
  });

  it('GET /v1/locations/city', async function () {
    const KARLSRUHE_POINT_1 = {
      latitude: 49.0069,
      longitude: 8.4037,
    };

    const response1 = await backendClient.locations.getCity(KARLSRUHE_POINT_1.latitude, KARLSRUHE_POINT_1.longitude);

    if (response1 === null) {
      throw new Error('Response data is null.');
    }

    expect(response1).to.be.a('object');
    expect(response1).to.have.property('name');
    expect(response1).to.have.property('fromCache');
    expect(response1.name).to.be.a('string');
    expect(response1.fromCache).to.be.a('boolean');
    expect(response1.name).to.equal('Karlsruhe');
    expect(response1.fromCache).to.equal(false);

    const KARLSRUHE_POINT_2 = getRandomPointAtRadius(
      KARLSRUHE_POINT_1.latitude,
      KARLSRUHE_POINT_1.longitude,
      CITY_RADIUS_IN_METERS - 10
    );
    const response2 = await backendClient.locations.getCity(KARLSRUHE_POINT_2.latitude, KARLSRUHE_POINT_2.longitude);

    expect(response2.fromCache).to.equal(true);

    const KARLSRUHE_POINT_3 = getRandomPointAtRadius(
      KARLSRUHE_POINT_1.latitude,
      KARLSRUHE_POINT_1.longitude,
      CITY_RADIUS_IN_METERS + 10
    );
    const response3 = await backendClient.locations.getCity(KARLSRUHE_POINT_3.latitude, KARLSRUHE_POINT_3.longitude);
    expect(response3.fromCache).to.equal(false);
  });
});

/**
 * Generates a random point at a specific distance (radius) from a given coordinate.
 * @param {number} latitude - The latitude of the center point.
 * @param {number} longitude - The longitude of the center point.
 * @param {number} radius - The radius from the center point in meters.
 * @returns {{ latitude: number, longitude: number }} An object containing the random point's latitude and longitude.
 */
function getRandomPointAtRadius(latitude, longitude, radius) {
  const earthRadius = 6371e3; // Earth's radius in meters
  const radiusInDegrees = (radius / earthRadius) * (180 / Math.PI);

  // Generate a random angle in radians
  const theta = Math.random() * 2 * Math.PI;

  const y = radiusInDegrees * Math.sin(theta);
  const x = radiusInDegrees * Math.cos(theta);

  // Adjust the x-coordinate for the shrinking of the east-west distances
  const newLat = latitude + y;
  const newLon = longitude + x / Math.cos(latitude * (Math.PI / 180));

  return {
    latitude: newLat,
    longitude: newLon,
  };
}
