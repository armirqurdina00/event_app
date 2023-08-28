
import fs from 'fs';
import axios from 'axios';
import jwt_decode from 'jwt-decode';

const ACCESS_TOKEN_FILENAME = 'AccessToken.tmp';

var access_token_promise;

export async function get_access_token() {
  if (access_token_promise) {
    const access_token = await access_token_promise;
    if (is_not_expired(access_token)) return access_token;
  } else if (does_local_token_exist()) {
    const access_token = get_local_token();
    access_token_promise = access_token;
    if (is_not_expired(access_token)) return access_token;
  }

  access_token_promise = get_token_from_auth0();
  const access_token = await access_token_promise;
  save_access_token(access_token);
  return access_token;
}

export async function get_user() {
  const access_token = await get_access_token();
  const jwt_decoded: any = jwt_decode(access_token);
  return jwt_decoded.sub;
}

function is_not_expired(jwt) {
  const jwt_decoded: any = jwt_decode(jwt);
  return jwt_decoded.exp >= Date.now() / 1000 + 2 * 60;
}

function does_local_token_exist() {
  return fs.existsSync(`${__dirname}/../${ACCESS_TOKEN_FILENAME}`);
}

function get_local_token() {
  return JSON.parse(
    fs.readFileSync(`${__dirname}/../${ACCESS_TOKEN_FILENAME}`, 'utf-8')
  );
}

async function get_token_from_auth0() {
  const options = {
    method: 'POST',
    url: `${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`,
    headers: {
      'content-type': 'application/json',
    },
    data: JSON.stringify({
      client_id: process.env.AUTH0_TEST_M2M_APP_CLIENT_ID,
      client_secret: process.env.AUTH0_TEST_M2M_APP_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: 'client_credentials',
    }),
  };

  const response = await axios.request(options);

  return response.data.access_token;
}

async function save_access_token(accessToken) {
  fs.writeFileSync(
    `${__dirname}/../${ACCESS_TOKEN_FILENAME}`,
    JSON.stringify(accessToken)
  );
}
