import { Controller, Post, Patch, Get, Route, Query, Tags, Body, SuccessResponse, Response, Path, Security, Request, Delete } from 'tsoa';
import { GroupReqBody, GroupRes, GroupsRes, GroupPatchReqBody, HttpError, HttpBadRequestError, Page, PerPage, GroupUpvoteRes, GroupDownvoteRes, GroupIds } from '../commons/TsoaTypes';
import { get_group, get_groups, post_group, patch_group, delete_group, post_upvote, post_downvote, delete_downvote, get_user_upvotes, get_user_downvotes, delete_upvote } from '../services/GroupsService';
import { OperationError, log_error } from '../helpers';
import { HttpStatusCode } from '../commons/enums';

@Route('/v1/')
@Tags('Groups')
export class GroupsController extends Controller {

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

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Patch('/users/{user_id}/groups/{group_id}')
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

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Delete('/users/{user_id}/groups/{group_id}')
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

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('401', 'Unauthorized')
  @Response<HttpError>('403', 'Forbidden')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Security('auth0')
  @Get('/users/{user_id}/groups/upvotes')
  public async get_upvotes(@Request() request: any, @Path() user_id: string): Promise<GroupIds> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await get_user_upvotes(request.user.sub);
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
  @Post('/users/{user_id}/groups/{group_id}/upvotes')
  public async post_upvotes(@Path() user_id: string, @Path() group_id: string, @Request() request: any): Promise<GroupUpvoteRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_upvote(group_id, request.user.sub);
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
  @Delete('/users/{user_id}/groups/{group_id}/upvotes')
  public async delete_upvotes(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_upvote(group_id, request.user.sub);
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
  @Get('/users/{user_id}/groups/downvotes')
  public async get_downvotes(@Request() request: any, @Path() user_id: string): Promise<GroupIds> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await get_user_downvotes(request.user.sub);
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
  @Post('/users/{user_id}/groups/{group_id}/downvotes')
  public async post_downvotes(@Path() user_id: string, @Path() group_id: string, @Request() request: any): Promise<GroupDownvoteRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_downvote(group_id, request.user.sub);
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
  @Delete('/users/{user_id}/groups/{group_id}/downvotes')
  public async delete_downvotes(@Request() request: any, @Path() user_id: string, @Path() group_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_downvote(group_id, request.user.sub);
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
