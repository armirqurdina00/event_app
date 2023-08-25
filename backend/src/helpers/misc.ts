import { HttpStatusCode, LOG_COLORS } from '../commons/enums';
import { createHash as create_hash } from 'crypto';
import axios from 'axios';
import https from 'https';

// ########################################
// ########################################

axios.defaults.timeout = Number(process.env.BC_API_CALL_TIMEOUT) * 1000;
axios.defaults.httpsAgent = new https.Agent({ keepAlive: true });

// ########################################
// ########################################

const ACCESS_TOKEN_FILENAME = 'AccessToken.tmp';

var access_token_promise;

// ########################################
// ########################################

export class OperationError extends Error {
  constructor(readonly message: string, readonly status: HttpStatusCode) {
    super(message);
  }
}

// ########################################
// ########################################

export function log(message?: any, ...optionalParams: any[]) {
  const date = `${new Date().toLocaleDateString('de-DE')}, ${new Date().toLocaleTimeString('de-DE')}`;

  if (optionalParams.length !== 0)
    console.info(LOG_COLORS.FGGREEN, `[${date}, LOG]`, message, optionalParams);
  else
    console.info(LOG_COLORS.FGGREEN, `[${date}, LOG]`, message);
}

export function log_error(message?: any, ...optionalParams: any[]) {
  const date = `${new Date().toLocaleDateString('de-DE')}, ${new Date().toLocaleTimeString('de-DE')}`;

  if (optionalParams.length !== 0)
    console.info(LOG_COLORS.FGRED, `[${date}, ERROR]`, message, optionalParams);
  else
    console.info(LOG_COLORS.FGRED, `[${date}, ERROR]`, message);
}

// ########################################
// ########################################

export function sha256(data: string) {
  const hash = create_hash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

export function random_string(minLength = 0, acc = '') {
  if (acc.length <= minLength) {
    const str = Math.random().toString(36).slice(2);
    return random_string(minLength, acc.concat(str));
  }

  return acc.slice(0, minLength);
}