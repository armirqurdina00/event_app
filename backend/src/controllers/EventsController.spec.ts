import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import {
  BackendClient,
  EventRes,
  EventReqBody,
  EventPatchReqBody,
  ImageRes,
  RecurringPattern,
  ApiError,
} from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';
import axios, { AxiosResponse } from 'axios';
import path from 'path';
import FormData from 'form-data';
import fs from 'fs';
import moment from 'moment';
import { HttpStatusCode, NodeEnv } from '../commons/enums';
import { dataSource } from '../helpers';
import { startServer, stopServer } from '../server';

let backend_client: BackendClient;
const event_ids: string[] = [];
let user_id;

describe('Tests for events endpoints.', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  before(async function () {
    if (process.env.NODE_ENV === NodeEnv.development) {
      await startServer();
    }

    backend_client = new BackendClient({
      BASE: process.env.BU_API_URL,
      TOKEN: get_access_token,
    });

    user_id = await get_user_id();

    await dataSource.query('DELETE FROM event_upvote_e;');
    await dataSource.query('DELETE FROM event_downvote_e;');
    await dataSource.query('DELETE FROM event_e;');
  });

  after(async function () {
    for (let i = 0; i < event_ids.length; i++) {
      await backend_client.events.deleteEvent(user_id, event_ids[i]);
    }
    await stopServer();
  });

  it('POST /v1/events', async function () {
    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      image_url: 'http://res.cloudinary.com/dqolsfqjt/image/upload/v1691513488/vt97k2aqwhhf85njpucg.jpg',
      url: 'https://www.facebook.com/events/985182309362614/',
      recurring_pattern: RecurringPattern.WEEKLY,
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const response: EventRes = await backend_client.events.postEvent(user_id, body);
    event_ids.push(response.event_id);

    try {
      const response2: EventRes = await backend_client.events.postEvent(user_id, body);
      event_ids.push(response2.event_id);
      throw new Error('Expected API to return 400 but it did not.');
    } catch (error: any) {
      expect(error?.status).to.equal(400);
    }

    expect(response.unix_time).to.equal(body.unix_time);
    expect(response.title).to.equal(body.title);
    expect(response.location).to.equal(body.location);
    expect(response.image_url).to.equal(body.image_url);
    expect(response.url).to.equal(body.url);
    expect(response.recurring_pattern).to.equal(body.recurring_pattern);
  });

  it('POST /v1/events/{event_id}/interests', async function () {
    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      image_url: 'http://res.cloudinary.com/dqolsfqjt/image/upload/v1691513488/vt97k2aqwhhf85njpucg.jpg',
      url: 'https://www.facebook.com/events/985182309362614/',
      recurring_pattern: RecurringPattern.WEEKLY,
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const { event_id, numberOfInterests }: EventRes = await backend_client.events.postEvent(user_id, body);
    event_ids.push(event_id);

    expect(numberOfInterests).to.equal(0);

    for (let i = 1; i <= 5; i++) {
      const response: EventRes = await backend_client.events.postEventInterest(event_id);
      expect(response.numberOfInterests).to.equal(i);
    }
  });

  it('PATCH /v1/events/{event_id}', async function () {
    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const response1: EventRes = await backend_client.events.postEvent(user_id, body);
    event_ids.push(response1.event_id);

    const patch: EventPatchReqBody = {
      title: 'Street Salsa 2',
    };

    const response2: EventRes = await backend_client.events.patchEvent(user_id, response1.event_id, patch);

    expect(response2.title).to.equal(patch.title);
  });

  it('GET /v1/events/{event_id} and GET /v1/events', async function () {
    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const number_of_items = 3;

    for (let i = 0; i < number_of_items; i++) {
      body.unix_time = body.unix_time + 1;
      const { event_id } = await backend_client.events.postEvent(user_id, body);
      event_ids.push(event_id);
    }

    // ########################################
    // ########################################

    const response_1 = await backend_client.events.getEvent(event_ids[0]);

    expect(response_1.title).to.equal(body.title);

    // ########################################
    // ########################################

    const page = 1;
    const per_page = 2;

    const response_2 = await backend_client.events.getEvents(page, per_page);

    expect(response_2.page).to.be.a('number');
    expect(response_2.per_page).to.be.a('number');
    expect(response_2.total_number_of_items).to.be.a('number');
    expect(response_2.items).to.be.a('array');

    expect(response_2.page).to.equal(page);
    expect(response_2.per_page).to.equal(per_page);
    expect(response_2.total_number_of_items).to.be.above(number_of_items - 1);
  });

  it('GET /v1/events returns only events within the specified radius.', async function () {
    const event_ids_inside: string[] = [];
    const event_ids_outside: string[] = [];

    const centerCoordinates = {
      latitude: 49.0069,
      longitude: 8.4037,
    };
    const { longitude, latitude } = centerCoordinates;
    const distance = 5; // 5 km

    // Unique titles for data independence
    const titleInside = `Street Salsa Inside ${Date.now()}`;
    const titleOutside = `Street Salsa Outside ${Date.now()}`;

    // Event data within the radius
    const bodyInsideRadius: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: titleInside,
      location: 'City Park Inside',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: centerCoordinates,
    };

    // Event data outside the radius
    const bodyOutsideRadius: EventReqBody = {
      ...bodyInsideRadius,
      title: titleOutside,
      location: 'City Park Outside',
      coordinates: {
        ...bodyInsideRadius.coordinates,
        longitude: longitude + 0.1, // adjust to ensure outside the radius
      },
    };

    const eventsInside = 3;
    const eventsOutside = 2;

    for (let i = 0; i < eventsInside; i++) {
      bodyInsideRadius.unix_time = bodyInsideRadius.unix_time + 1;
      const { event_id } = await backend_client.events.postEvent(user_id, bodyInsideRadius);
      event_ids_inside.push(event_id);
      event_ids.push(event_id);
    }

    for (let i = 0; i < eventsOutside; i++) {
      bodyOutsideRadius.unix_time = bodyOutsideRadius.unix_time + 1;
      const { event_id } = await backend_client.events.postEvent(user_id, bodyOutsideRadius);
      event_ids_outside.push(event_id);
      event_ids.push(event_id);
    }

    const response = await backend_client.events.getEvents(1, 100, latitude, longitude, distance);

    // Assertions based on unique titles
    const returnedEventsInside = response.items.filter(event => event.title === titleInside);
    const returnedEventsOutside = response.items.filter(event => event.title === titleOutside);

    expect(returnedEventsInside.length).to.equal(eventsInside);
    expect(returnedEventsOutside.length).to.equal(0);
  });

  it('DELETE /v1/events/{event_id}', async function () {
    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const { event_id }: EventRes = await backend_client.events.postEvent(user_id, body);

    await backend_client.events.deleteEvent(user_id, event_id);

    try {
      await backend_client.events.getEvent(event_id);
      throw new Error('Event was not deleted');
    } catch (err: any | ApiError) {
      expect(err instanceof ApiError);
      expect(err.status).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it('POST /v1/events/{event_id}/images', async function () {
    const access_token = await get_access_token();

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      recurring_pattern: RecurringPattern.NONE,
      coordinates: {
        latitude: 49.0069,
        longitude: 8.4037,
      },
    };

    const { event_id } = await backend_client.events.postEvent(user_id, body);
    event_ids.push(event_id);

    const filePath = __dirname + '/test-data/sample.jpg';

    const formData = new FormData();

    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'image/jpg',
    });

    const headers = {
      Authorization: `Bearer ${access_token}`,
      ...formData.getHeaders(), // Include the Content-Type header for multipart/form-data
    };

    const response2: AxiosResponse<ImageRes> = await axios.post(
      `http://localhost:8080/v1/users/${user_id}/events/${event_id}/images`,
      formData,
      {
        headers: headers,
      }
    );

    expect(response2.data.url).to.include('cloudinary');
  });
});
