import { Controller, Post, Patch, Get, Route, Query, Tags, Body, SuccessResponse, Response, Path, Security, Request, Delete } from 'tsoa';
import { GroupReqBody, GroupRes, GroupsRes, GroupPatchReqBody, HttpError, HttpBadRequestError, GroupJoinRes, UserGroupRes } from '../commons/TsoaTypes';
import { get_group, get_groups, post_group, patch_group, delete_group, post_group_join, get_group_join, get_user_group } from '../services/GroupsService';
import { OperationError, log_error } from '../helpers';
import { HttpStatusCode } from '../commons/enums';

@Route('/v1/')
@Tags('Groups')
export class GroupsController extends Controller {

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
      return await get_groups(page, per_page, latitude, longitude, distance, title);
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
      return await get_group(group_id);
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
  public async post_groups(@Request() request: any, @Path() user_id: string, @Body() req_body: GroupReqBody): Promise<GroupRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_group(request.user.sub, req_body);
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
  public async patch_group(@Request() request: any, @Path() user_id: string, @Path() group_id: string, @Body() req_body: GroupPatchReqBody): Promise<GroupRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await patch_group(request.user.sub, group_id, req_body);
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
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_group(request.user.sub, group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @Get('/users/{user_id}/groups/{group_id}')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  public async get_user_group(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<UserGroupRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await get_user_group(request.user.sub, group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @Post('/users/{user_id}/groups/{group_id}/joins')
  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  public async post_group_join(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<GroupJoinRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_group_join(request.user.sub, group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

@Get('/users/{user_id}/groups/{group_id}/joins')
@SuccessResponse('200', 'Successful')
@Response<HttpBadRequestError>('400', 'Bad Request')
@Response<HttpError>('401', 'Unauthorized')
@Response<HttpError>('403', 'Forbidden')
@Response<HttpError>('404', 'Not Found')
@Response<HttpError>('500', 'Internal Server Error')
@Security('auth0')
  public async get_group_join(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<GroupJoinRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await get_group_join(request.user.sub, group_id);
    } catch (err) {
      log_error(err);
      throw err;
    }
  }
}

// helpers

function raise_forbidden() {
  throw new OperationError('Forbidden.', HttpStatusCode.FORBIDDEN);
}
