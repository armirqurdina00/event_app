import {
  Controller,
  Post,
  Patch,
  Get,
  Route,
  Query,
  Tags,
  Body,
  SuccessResponse,
  Response,
  Path,
  Security,
  Request,
  Delete,
  UploadedFile,
} from 'tsoa';
import {
  EventReqBody,
  EventRes,
  EventsRes,
  EventPatchReqBody,
  HttpError,
  HttpBadRequestError,
  ImageRes,
} from '../commons/TsoaTypes';
import { dataSource, OperationError, log_error } from '../helpers';
import { HttpStatusCode, OrderBy } from '../commons/enums';
import { EventsService } from '../services/EventsService';

// ########################################
// ########################################

@Route('/v1/')
@Tags('Events')
export class EventsController extends Controller {
  private eventsService: EventsService;

  constructor() {
    super();
    this.eventsService = new EventsService(dataSource);
  }

  /**
   * Fetches events possibly filtered by geo-coordinates and a distance.
   *
   * @param page Current page number.
   * @example page 1
   * @param per_page Number of events per page.
   * @example per_page 10
   * @param latitude Latitude of the search center.
   * @example latitude 49.0069
   * @param longitude Longitude of the search center.
   * @example longitude 8.4037
   * @param distance Distance in kilometers around the provided geo-coordinates.
   * @example distance 5
   * @example title "Salsa Kizz"
   * @param start_unix_time The beginning timestamp of the event, represented in milliseconds since the Unix epoch.
   * @param end_unix_time The concluding timestamp of the event, represented in milliseconds since the Unix epoch.
   * @param order_by Determine the sorting method: 'chronological' or 'popularity'. Default is 'chronological'.
   * @example order_by "popularity"
   */
  @Get('/events')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  public async get_events(
    @Query() page: number,
    @Query() per_page: number,
    @Query() latitude?: number,
    @Query() longitude?: number,
    @Query() distance?: number,
    @Query() title?: string,
    @Query() start_unix_time?: number,
    @Query() end_unix_time?: number,
    @Query() order_by: OrderBy = OrderBy.Chronological
  ): Promise<EventsRes> {
    try {
      const service = await this.eventsService;
      return await service.get_events(
        page,
        per_page,
        latitude,
        longitude,
        distance,
        title,
        start_unix_time,
        end_unix_time,
        order_by
      );
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/events/{event_id}')
  public async get_event(@Path() event_id: string): Promise<EventRes> {
    try {
      const service = await this.eventsService;
      return await service.get_event(event_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Post('/users/{user_id}/events')
  public async post_event(
    @Request() request: any,
    @Path() user_id: string,
    @Body() req_body: EventReqBody
  ): Promise<EventRes> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();

      const service = await this.eventsService;
      return await service.post_event(request.user.sub, req_body);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Patch('/users/{user_id}/events/{event_id}')
  public async patch_event(
    @Request() request: any,
    @Path() user_id: string,
    @Path() event_id: string,
    @Body() req_body: EventPatchReqBody
  ): Promise<EventRes> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();

      const service = await this.eventsService;
      return await service.patch_event(request.user.sub, event_id, req_body);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Delete('/users/{user_id}/events/{event_id}')
  public async delete_event(@Request() request: any, @Path() user_id: string, @Path() event_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();

      const service = await this.eventsService;
      await service.delete_event(request.user.sub, event_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('500', 'Internal Server Error')
  @Post('/events/{event_id}/interests')
  public async post_event_interest(@Path() event_id: string): Promise<EventRes> {
    try {
      const service = await this.eventsService;
      return await service.post_event_interest(event_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Post('/users/{user_id}/events/{event_id}/images')
  public async uploadFile(
    @Request() request: any,
    @UploadedFile() file: Express.Multer.File,
    @Path() user_id: string,
    @Path() event_id: string
  ): Promise<ImageRes> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();

      const service = await this.eventsService;
      return await service.post_image(user_id, event_id, file);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  private raise_forbidden() {
    throw new OperationError('Forbidden.', HttpStatusCode.FORBIDDEN);
  }
}
