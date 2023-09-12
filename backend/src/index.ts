import assert from 'assert';

assert(process.env.NODE_ENV, 'Environment variable \'NODE_ENV\' undefined.');
assert(process.env.PORT, 'Environment variable \'PORT\' undefined.');
assert(process.env.DATABASE_USERNAME, 'Environment variable \'DATABASE_USERNAME\' undefined.');
assert(process.env.DATABASE_PASSWORD, 'Environment variable \'DATABASE_PASSWORD\' undefined.');
assert(process.env.DATABASE_HOST, 'Environment variable \'DATABASE_HOST\' undefined.');
assert(process.env.DATABASE_NAME, 'Environment variable \'DATABASE_NAME\' undefined.');
assert(process.env.AUTH0_ISSUER_BASE_URL, 'Environment variable \'AUTH0_ISSUER_BASE_URL\' undefined.');
assert(process.env.AUTH0_AUDIENCE, 'Environment variable \'AUTH0_AUDIENCE\' undefined.');
assert(process.env.CLOUDINARY_URL, 'Environment variable \'CLOUDINARY_URL\' undefined.');
assert(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS, 'Environment variable \'EVENT_UPDATE_INTERVAL_IN_SECONDS\' undefined.');

if (process.env.NODE_ENV==='DEVELOPMENT') { // for testing
  assert(process.env.AUTH0_TEST_M2M_APP_CLIENT_ID, 'Environment variable \'AUTH0_TEST_M2M_APP_CLIENT_ID\' undefined');
  assert(process.env.AUTH0_TEST_M2M_APP_CLIENT_SECRET, 'Environment variable \'AUTH0_TEST_M2M_APP_CLIENT_SECRET\' undefined');
  assert(process.env.TESTS_TIMEOUT_IN_SECONDS, 'Environment variable \'TESTS_TIMEOUT_IN_SECONDS\' undefined');
  assert(process.env.BU_API_REQUESTS_PER_SECOND, 'Environment variable \'BU_API_REQUESTS_PER_SECOND\' undefined');
  assert(process.env.BU_API_URL, 'Environment variable \'BU_API_URL\' undefined');
}

import { error_handler, not_found_handler, swagger_ui_handler, log, start_managing_events, Database } from './helpers';
import express, { Application } from 'express';
import morgan from 'morgan';
import swagger_ui from 'swagger-ui-express';
import { RegisterRoutes as register_tsoa_routes } from '../build/routes';
import * as path from 'path';
import cors from 'cors';

// ########################################
// ########################################

const app: Application = express();

app.use(cors());

app.use(express.json()); // parses http json body to js object 'request.body'

app.use(morgan('dev')); // logs http calls to stdout

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.get('/oauth2-redirect.html', (request, response) => {
//   // route callback from auth0 to the right html page
//   response.redirect('/api/docs/oauth2-redirect.html');
// });

app.use('/api/docs/oas', express.static(path.join(__dirname, '../build/swagger.json')));

app.use('/api/docs', swagger_ui.serve, swagger_ui_handler); // serves swagger ui

register_tsoa_routes(app); // express routing based on tsoa ./controllers/*

app.use(not_found_handler);

app.use(error_handler);

// ########################################
// ########################################

export default (async () => {
  await Database.init();

  start_managing_events();

  await app.listen(process.env.PORT);
  log(`API is available on http://localhost:${process.env.PORT}/api`);
  log(`Swagger-ui is available on http://localhost:${process.env.PORT}/api/docs`);

})();
