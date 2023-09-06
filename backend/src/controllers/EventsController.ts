import { Controller, Post, Patch, Get, Route, Query, Tags, Body, SuccessResponse, Response, Path, Security, Request, Delete, UploadedFile } from 'tsoa';
import { EventReqBody, EventRes, EventsRes, EventPatchReqBody, HttpError, HttpBadRequestError, Page, PerPage, ImageRes, EventDownvoteRes, EventUpvoteRes, EventIds } from '../commons/TsoaTypes';
import { post_event, patch_event, get_event, get_events, delete_event, post_image, delete_downvote, delete_upvote, get_user_downvotes, get_user_upvotes, post_downvote, post_upvote } from '../services/EventsService';
import { OperationError, log_error } from '../helpers';
import { HttpStatusCode } from '../commons/enums';

// ########################################
// ########################################

@Route('/v1/')
@Tags('Events')
export class EventsController extends Controller {

  @SuccessResponse('200', 'Successful')
  @Response<HttpBadRequestError>('400', 'Bad Request')
  @Response<HttpError>('404', 'Not Found')
  @Response<HttpError>('500', 'Internal Server Error')
  @Get('/events')
  public async get_events(@Query() page: Page,@Query() per_page: PerPage): Promise<EventsRes> {
    try {
      return await get_events(page, per_page);
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
      return await get_event(event_id);
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
  public async post_events(@Request() request: any, @Path() user_id: string, @Body() req_body: EventReqBody): Promise<EventRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_event(request.user.sub, req_body);
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
  public async patch_event(@Request() request: any, @Path() user_id: string, @Path() event_id: string, @Body() req_body: EventPatchReqBody): Promise<EventRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await patch_event(request.user.sub, event_id, req_body);
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
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_event(request.user.sub, event_id);
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
  @Get('/users/{user_id}/events/upvotes')
  public async get_upvotes(@Request() request: any, @Path() user_id: string): Promise<EventIds> {
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
  @Post('/users/{user_id}/events/{event_id}/upvotes')
  public async post_upvotes(@Path() user_id: string, @Path() event_id: string, @Request() request: any): Promise<EventUpvoteRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_upvote(event_id, request.user.sub);
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
  @Delete('/users/{user_id}/events/{event_id}/upvotes')
  public async delete_upvotes(@Request() request: any, @Path() user_id: string, @Path() event_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_upvote(event_id, request.user.sub);
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
  @Get('/users/{user_id}/events/downvotes')
  public async get_downvotes(@Request() request: any, @Path() user_id: string): Promise<EventIds> {
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
  @Post('/users/{user_id}/events/{event_id}/downvotes')
public async post_downvotes(@Path() user_id: string, @Path() event_id: string, @Request() request: any): Promise<EventDownvoteRes> {
  try {
    if (request.user.sub !== user_id)
      raise_forbidden();

    return await post_downvote(event_id, request.user.sub);
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
  @Delete('/users/{user_id}/events/{event_id}/downvotes')
  public async delete_downvotes(@Request() request: any, @Path() user_id: string, @Path() event_id: string): Promise<void> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      await delete_downvote(event_id, request.user.sub);
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
  public async uploadFile(@Request() request: any, @UploadedFile() file: Express.Multer.File, @Path() user_id: string, @Path() event_id: string): Promise<ImageRes> {
    try {
      if (request.user.sub !== user_id)
        raise_forbidden();

      return await post_image(user_id, event_id, file);
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
