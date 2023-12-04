import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import { dataSource } from '../helpers';
import { LocationsService } from './LocationsService';

let locationsService: LocationsService;

describe('Tests for locations endpoints.', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
  before(async function () {
    if (!dataSource.isInitialized) await dataSource.initialize();

    await dataSource.query('DELETE FROM location_e;');

    locationsService = new LocationsService(dataSource);
  });

  it('getCoordinates()', async function () {
    const locationNames = [
      'Son Latino Tanzschule, Karlsruhe',
      'Karlsruhe, Drums & Dance',
      'Köln, Dasselstraße 75',
      'Prague, Paspův Sál',
      'Freiburg im Breisgau, Kaiser-Joseph-Straße 268 79098 Freiburg',
      'Strasbourg, CSC Meinau',
      'Berlin, Gaststätte Tegeler Seeterrassen',
      'Pforzheimer Str. 68 76275 Ettlingen',
    ];

    for (let i = 0; i < 5; i++) {
      const locationName = locationNames[i];
      const coordinatesRes = await locationsService.getCoordinates(locationName);

      expect(coordinatesRes).to.be.a('object');
      expect(coordinatesRes).to.have.property('latitude');
      expect(coordinatesRes).to.have.property('longitude');
      expect(coordinatesRes).to.have.property('fromCache');
      expect(coordinatesRes.latitude).to.be.a('number');
      expect(coordinatesRes.longitude).to.be.a('number');
      expect(coordinatesRes.fromCache).to.be.a('boolean');
      expect(coordinatesRes.fromCache).to.equal(false);

      const cityRes = await locationsService.getCity({
        latitude: coordinatesRes.latitude,
        longitude: coordinatesRes.longitude,
      });

      expect(locationName).to.include(cityRes.name);

      const coordinatesRes2 = await locationsService.getCoordinates(locationName);
      expect(coordinatesRes2.fromCache).to.equal(true);
    }
  });
});
