import assert from 'assert';
import { NodeEnv } from './commons/enums';

assert(process.env.NODE_ENV, "Env. variable 'NODE_ENV' undefined.");
assert(process.env.PORT, "Env. variable 'PORT' undefined.");
assert(process.env.DATABASE_USERNAME, "Env. variable 'DATABASE_USERNAME' undefined.");
assert(process.env.DATABASE_PASSWORD, "Env. variable 'DATABASE_PASSWORD' undefined.");
assert(process.env.DATABASE_HOST, "Env. variable 'DATABASE_HOST' undefined.");
assert(process.env.DATABASE_NAME, "Env. variable 'DATABASE_NAME' undefined.");
assert(process.env.AUTH0_ISSUER_BASE_URL, "Env. variable 'AUTH0_ISSUER_BASE_URL' undefined.");
assert(process.env.AUTH0_AUDIENCE, "Env. variable 'AUTH0_AUDIENCE' undefined.");
assert(process.env.CLOUDINARY_URL, "Env. variable 'CLOUDINARY_URL' undefined.");
assert(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS, "Env. variable 'EVENT_UPDATE_INTERVAL_IN_SECONDS' undefined.");
assert(process.env.GOOGLE_MAPS_API_KEY, "Env. variable 'GOOGLE_MAPS_API_KEY' undefined.");
assert(process.env.NUMBER_OF_DB_CONNECTIONS, "Env. variable 'NUMBER_OF_DB_CONNECTIONS' undefined.");
assert(process.env.DATABASE_PORT, "Env. variable 'DATABASE_PORT' undefined.");

if (process.env.NODE_ENV === NodeEnv.development) {
  assert(process.env.AUTH0_TEST_M2M_APP_CLIENT_ID, "Env. variable 'AUTH0_TEST_M2M_APP_CLIENT_ID' undefined");
  assert(process.env.AUTH0_TEST_M2M_APP_CLIENT_SECRET, "Env. variable 'AUTH0_TEST_M2M_APP_CLIENT_SECRET' undefined");
  assert(process.env.TESTS_TIMEOUT_IN_SECONDS, "Env. variable 'TESTS_TIMEOUT_IN_SECONDS' undefined");
  assert(process.env.BU_API_REQUESTS_PER_SECOND, "Env. variable 'BU_API_REQUESTS_PER_SECOND' undefined");
  assert(process.env.BU_API_URL, "Env. variable 'BU_API_URL' undefined");
}

import { error_handler, not_found_handler, swagger_ui_handler, dataSource } from './helpers';
import express, { Express } from 'express';
import morgan from 'morgan';
import swagger_ui from 'swagger-ui-express';
import { RegisterRoutes as register_tsoa_routes } from '../build/routes';
import * as path from 'path';
import cors from 'cors';
import EventManager from './helpers/EventManager';

let server: ReturnType<Express['listen']> | null = null;
let eventManager: EventManager | null = null;
let isShuttingDown = false;
let isStarting = false;

async function startServer(): Promise<void> {
  try {
    if (isStarting) {
      console.info('Server already starting.');
      return;
    }
    isStarting = true;
    isShuttingDown = false;

    await dataSource.initialize();
    eventManager = new EventManager(dataSource);

    eventManager.start();

    const app = setupExpressApp();
    server = app.listen(process.env.PORT, () => {
      console.info(`API is available on http://localhost:${process.env.PORT}/api`);
      console.info(`Swagger-ui is available on http://localhost:${process.env.PORT}/api/docs`);
    });
  } catch (err) {
    console.error('Error during server startup:', err);
    await stopServer();
    throw err;
  }
}

function setupExpressApp(): Express {
  const app = express();

  app.use(cors());

  app.use(express.json()); // parses http json body to js object 'request.body'

  app.use(morgan('dev')); // logs http calls to stdout

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.use('/api/docs/oas', express.static(path.join(__dirname, '../build/swagger.json')));

  app.use('/api/docs', swagger_ui.serve, swagger_ui_handler); // serves swagger ui

  register_tsoa_routes(app); // express routing based on tsoa ./controllers/*

  app.use(not_found_handler);

  app.use(error_handler);

  return app;
}

async function stopServer(): Promise<void> {
  if (server === null) {
    console.info('Server not running.');
    return;
  }

  if (isShuttingDown) {
    console.info('Server already shutting down.');
    return;
  }
  isShuttingDown = true;
  isStarting = false;

  if (dataSource !== null && dataSource.isInitialized) {
    try {
      console.info('Closing database connection ...');
      await dataSource.destroy();
      console.info('Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }

  if (eventManager !== null) {
    try {
      console.info('Stopping EventManager ...');
      await eventManager.stop();
      console.info('EventManager stopped.');
    } catch (err) {
      console.error('Error stopping EventManager:', err);
    }
  }

  await new Promise<void>((resolve, reject) => {
    if (server !== null) {
      console.info('Stopping server ...');
      server.close(err => {
        if (err) {
          console.error('Error stopping server:', err);
          return reject(err);
        }
        console.info('Server stopped.');
        resolve();
      });
    } else {
      console.info('Server not running.');
      resolve();
    }
  });
}

export { startServer, stopServer };
