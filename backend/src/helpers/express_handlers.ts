import { Response as ExResponse, Request as ExRequest, NextFunction } from 'express';
import swagger_ui from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { NodeEnv, HttpStatusCode } from '../commons/enums';
import { HttpError, HttpBadRequestError } from '../commons/TsoaTypes';
import { OperationError } from './index';
import { log_error } from './misc';

// ########################################
// ########################################

export async function swagger_ui_handler(req: ExRequest, res: ExResponse) {
  return res.send(swagger_ui.generateHTML(await import('../../build/swagger.json')));
}

// ########################################
// ########################################

export function not_found_handler(req: ExRequest, res: ExResponse) {
  res.status(HttpStatusCode.NOT_FOUND).json({
    message: 'Not Found',
    status: HttpStatusCode.NOT_FOUND
  });
}

// ########################################
// ########################################

export function error_handler(err: any, req: ExRequest, res: ExResponse, next: NextFunction): ExResponse | void {

  const body = get_error_body(err);

  log_to_console(req, err, body);

  res.status(body.status).json(body);
}

function get_error_body(err: any): HttpError | HttpBadRequestError {

  if (err instanceof OperationError) {
    return {
      message: err.message !== '' ? err.message : 'Bad Request',
      status: err.status
    };
  } else if (err instanceof ValidateError){
    return {
      message: err.message !== '' ? err.message : 'Bad Request',
      fields: err.fields,
      status: err.status,
    };
  } else if (err.status && err.status !== 500){
    return {
      message: err.message !== '' ? err.message : 'Bad Request',
      status: err.status
    };
  } else {
    return {
      message: 'Internal Server Error',
      status: HttpStatusCode.INTERNAL_SERVER_ERROR
    };
  }
}

function log_to_console(req: ExRequest, err: any, body: HttpError | HttpBadRequestError) {
  if (body.status === 500) {
    log_error(`${req.method} ${req.url} ${body.status} failed:`);
    log_error(err);
  } else {
    log_error(`${req.method} ${req.url} ${body.status} failed:`);
  }
  log_error(body);
}