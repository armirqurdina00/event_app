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
} from 'tsoa';
import {
  GroupReqBody,
  GroupRes,
  GroupsRes,
  GroupPatchReqBody,
  HttpError,
  HttpBadRequestError,
} from '../commons/TsoaTypes';
import { dataSource, OperationError, log_error } from '../helpers';
import { HttpStatusCode } from '../commons/enums';
import { GroupsService } from '../services/GroupsService';

@Route('/v1/')
@Tags('Groups')
export class GroupsController extends Controller {
  private groupsService: GroupsService;

  constructor() {
    super();

    this.groupsService = new GroupsService(dataSource);
  }

  /**
   * Fetches groups possibly filtered by geo-coordinates and a distance.
   *
   * @param page Current page number.
   * @example page 1
   * @param per_page Number of groups per page.
   * @example per_page 10
   * @param latitude Latitude of the search center.
   * @example latitude 49.0069
   * @param longitude Longitude of the search center.
   * @example longitude 8.4037
   * @param distance Distance in kilometers around the provided geo-coordinates.
   * @example distance 5
   * @example title "Karlsruhe • sabaki.dance"
   */
  @Get('/groups')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  public async get_groups(
    @Query() page: number,
    @Query() per_page: number,
    @Query() latitude?: number,
    @Query() longitude?: number,
    @Query() distance?: number,
    @Query() title?: string
  ): Promise<GroupsRes> {
    try {
      const service = await this.groupsService;
      return await service.get_groups(page, per_page, latitude, longitude, distance, title);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @Get('/groups/{group_id}')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  public async get_group(@Path() group_id: string): Promise<GroupRes> {
    try {
      const service = await this.groupsService;
      return await service.get_group(group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('500', 'Internal Server Error')
  @Post('/groups/{group_id}/joins')
  public async post_groups_joins(@Path() group_id: string): Promise<GroupRes> {
    try {
      const service = await this.groupsService;
      return service.post_groups_joins(group_id);
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
  @Post('/users/{user_id}/groups')
  public async post_groups(
    @Request() request: any,
    @Path() user_id: string,
    @Body() req_body: GroupReqBody
  ): Promise<GroupRes> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();
      const service = await this.groupsService;
      return service.post_group(request.user.sub, req_body);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @Patch('/users/{user_id}/groups/{group_id}')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  public async patch_group(
    @Request() request: any,
    @Path() user_id: string,
    @Path() group_id: string,
    @Body() req_body: GroupPatchReqBody
  ): Promise<GroupRes> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();
      const service = await this.groupsService;
      return await service.patch_group(request.user.sub, group_id, req_body);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @Delete('/users/{user_id}/groups/{group_id}')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  public async delete_group(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id) this.raise_forbidden();
      const service = await this.groupsService;
      await service.delete_group(request.user.sub, group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  private raise_forbidden() {
    throw new OperationError('Forbidden.', HttpStatusCode.FORBIDDEN);
  }
}
