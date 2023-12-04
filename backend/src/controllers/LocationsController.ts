import { LocationsService } from '../services/LocationsService';
import { CityRes, HttpBadRequestError, HttpError, LocationReqBody } from '../commons/TsoaTypes';
import { dataSource, log_error } from '../helpers';
import { Controller, Get, Route, SuccessResponse, Tags, Response, Query, Post, Body } from 'tsoa';

@Route('/v1/')
@Tags('Locations')
export class LocationsController extends Controller {
  private locationsService: LocationsService;

  constructor() {
    super();
    this.locationsService = new LocationsService(dataSource);
  }

  /**
   * Fetches city from geo-coordinates.
   *
   * @param latitude Latitude of any Point within the city.
   * @example latitude 49.0069
   * @param longitude Longitude of any Point within the city.
   * @example longitude 8.4037
   */
  @Get('/locations/city')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('500', 'Internal Server Error')
  public async get_city(@Query() latitude: number, @Query() longitude: number): Promise<CityRes> {
    try {
      const service = await this.locationsService;
      return await service.getCity({ latitude, longitude });
    } catch (err) {
      log_error(err);
      throw err;
    }
  }
}
