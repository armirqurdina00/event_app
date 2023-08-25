import { Controller, Post, Patch, Get, Route, Query, Tags, Body, SuccessResponse, Response, Path, Security, Request, Delete } from 'tsoa';
import { GroupReqBody, GroupRes, GroupsRes, GroupPatchReqBody, HttpError, HttpBadRequestError, Page, PerPage, GroupUpvoteRes, GroupDownvoteRes } from '../commons/TsoaTypes';
import { get_group, get_groups, post_group, patch_group } from '../services/GroupsService';
import { log_error } from '../helpers';

@Route('/v1/')
@Tags('Groups')
export class GroupsController extends Controller {

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Post('/groups')
  public async post_groups(@Request() request: any, @Body() req_body: GroupReqBody): Promise<GroupRes> {
    try {
      return await post_group(request.user.sub, req_body);
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
  @Patch('/groups/{group_id}')
  public async patch_group(@Request() request: any, @Path() group_id: string, @Body() req_body: GroupPatchReqBody): Promise<GroupRes> {
    try {
      return await patch_group(request.user.sub, group_id, req_body);
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
  @Delete('/groups/{group_id}')
  public async delete_group(@Request() request: any,@Path() group_id: string): Promise<void> {
    try {
      return;
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/groups/{group_id}')
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
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/groups')
  public async get_groups(@Query() page: Page,@Query() per_page: PerPage): Promise<GroupsRes> {
    try {
      return await get_groups(page, per_page);
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
  @Post('/groups/{group_id}/upvotes')
  public async post_upvotes(@Path() group_id: string, @Request() request: any): Promise<GroupUpvoteRes> {
    try {
      return {
        group_id: 'string',
        user_id: 'string'
      };
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/groups/{group_id}/upvotes')
  public async get_upvotes(@Path() group_id: string): Promise<GroupUpvoteRes[]> {
    try {
      return [{
        group_id: 'string',
        user_id: 'string'
      }];
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
  @Delete('/groups/{group_id}/upvotes')
  public async delete_upvotes(@Request() request: any, @Path() group_id: string): Promise<void> {
    try {
      return;
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
  @Post('/groups/{group_id}/downvotes')
  public async post_downvotes(@Path() group_id: string, @Request() request: any): Promise<GroupDownvoteRes> {
    try {
      return {
        group_id: 'string',
        user_id: 'string'
      };
    } catch (err) {
      log_error(err);
      throw err;
    }
  }

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/groups/{group_id}/downvotes')
  public async get_downvotes(@Path() group_id: string): Promise<GroupDownvoteRes[]> {
    try {
      return [{
        group_id: 'string',
        user_id: 'string'
      }];
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
  @Delete('/groups/{group_id}/downvotes')
  public async delete_downvotes(@Request() request: any, @Path() group_id: string): Promise<void> {
    try {
      return;
    } catch (err) {
      log_error(err);
      throw err;
    }
  }
}