import { DataSource, Repository } from 'typeorm';
import { LocationType } from '../commons/enums';
import { LocationE } from '../commons/typeorm_entities/LocationE';
import { CityRes, Coordinates, CoordinatesRes } from '../commons/TsoaTypes';
import { AddressType, Client } from '@googlemaps/google-maps-services-js';

export const CITY_RADIUS_IN_METERS = 500; // assuming that cities are at least twice as many meters apart

export class LocationsService {
  private locationRepo: Repository<LocationE>;

  constructor(private dataSource: DataSource) {
    this.locationRepo = this.dataSource.getRepository(LocationE);
  }

  // used by frontend to get city name by coordinates from device
  // used by crawler to get city name by coordinates for event
  public async getCity(coordinates: Coordinates): Promise<CityRes> {
    const locRes = await this.locationRepo
      .createQueryBuilder('location')
      .where('location.type = :type', { type: LocationType.CITY })
      .andWhere(
        'ST_DWithin(location.point, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :distance)'
      )
      .setParameters({
        longitude: coordinates.longitude,
        latitude: coordinates.latitude,
        distance: CITY_RADIUS_IN_METERS,
      })
      .getMany();

    if (locRes.length > 1) {
      const cities = new Set();
      locRes.forEach(city => {
        cities.add(city.name);
      });
      if (cities.size > 1) {
        console.error(
          `More than one city found for coordinates: ${coordinates.latitude}, ${coordinates.longitude}. Retrieving city from Google.`
        );
        const city = await this.getCityFromGoogle(coordinates);
        await this.saveLocation(city, coordinates.latitude, coordinates.longitude, LocationType.CITY);
        return {
          name: city,
          fromCache: false,
        };
      }
    }

    if (locRes.length === 0) {
      console.info(
        `No city found for coordinates: ${coordinates.latitude}, ${coordinates.longitude}. Retrieving city from Google.`
      );
      const city = await this.getCityFromGoogle(coordinates);
      await this.saveLocation(city, coordinates.latitude, coordinates.longitude, LocationType.CITY);
      return {
        name: city,
        fromCache: false,
      };
    }

    const result: CityRes = {
      name: locRes[0].name,
      fromCache: true,
    };

    return result;
  }

  // used by crawler to get coordinates by facebook location name for event
  public async getCoordinates(locationName: string): Promise<CoordinatesRes> {
    const locRes = await this.locationRepo
      .createQueryBuilder('location')
      .where('location.type = :type', { type: LocationType.ADDRESS })
      .andWhere('name = :name', { name: locationName })
      .getMany();

    if (locRes.length > 1) {
      console.error(
        `More than one coordinate tuple found for location name: '${locationName}'. Retrieving coordinates from Google.`
      );
      const coords = await this.getCoordinatesFromGoogle(locationName);
      await this.saveLocation(locationName, coords.latitude, coords.longitude, LocationType.ADDRESS);
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        fromCache: false,
      };
    }

    if (locRes.length === 0) {
      console.info(`No coordinates found for location name: ${locationName}. Retrieving coordinates from Google.`);
      const coords = await this.getCoordinatesFromGoogle(locationName);
      await this.saveLocation(locationName, coords.latitude, coords.longitude, LocationType.ADDRESS);
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        fromCache: false,
      };
    }

    return {
      latitude: locRes[0].point.coordinates[1],
      longitude: locRes[0].point.coordinates[0],
      fromCache: true,
    };
  }

  private async getCoordinatesFromGoogle(location: string): Promise<{ latitude: number; longitude: number }> {
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

      return {
        latitude: loc.lat,
        longitude: loc.lng,
      };
    } else {
      throw new Error(`No coordinates found for ${location}.`);
    }
  }

  private async getCityFromGoogle(coordinates: Coordinates): Promise<string> {
    if (!process.env.GOOGLE_MAPS_API_KEY || typeof process.env.GOOGLE_MAPS_API_KEY !== 'string') {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined');
    }

    const client = new Client({});

    const response = await client.reverseGeocode({
      params: {
        latlng: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
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
    throw new Error(`No city found for coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
  }

  private async saveLocation(
    name: string,
    latitude: number,
    longitude: number,
    type: LocationType
  ): Promise<LocationE> {
    const location: LocationE = {
      name,
      type,
      point: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    };

    return await this.locationRepo.save(location);
  }

  private async getLocation(name: string): Promise<LocationE | null> {
    return await this.locationRepo.findOne({
      where: { name },
    });
  }
}
