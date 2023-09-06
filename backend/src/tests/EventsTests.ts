import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import { BackendClient, EventRes, EventReqBody, EventPatchReqBody, ImageRes, RecurringPattern, ApiError } from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';
import axios, { AxiosResponse } from 'axios';
import path from 'path';
import FormData from 'form-data';
import fs from 'fs';
import moment from 'moment';
import { HttpStatusCode } from '../commons/enums';

let backend_client: BackendClient;
const event_ids = [];
let user_id;

describe('Tests for events endpoints.', function() {

  before(async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    if (process.env.NODE_ENV==='DEVELOPMENT') {
      const server = require('../index').default;
      await server;
    }

    backend_client = new BackendClient({
      BASE: process.env.BU_API_URL,
      TOKEN: get_access_token
    });

    user_id = await get_user_id();
  });

  it('POST /v1/events', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      image_url: 'http://res.cloudinary.com/dqolsfqjt/image/upload/v1691513488/vt97k2aqwhhf85njpucg.jpg',
      recurring_pattern: RecurringPattern.WEEKLY,
      coordinates: [49.0069, 8.4037]
    };

    const response: EventRes = await backend_client.events.postEvents(user_id, body);
    event_ids.push(response.event_id);

    expect(response.unix_time).to.equal(body.unix_time);
    expect(response.title).to.equal(body.title);
    expect(response.location).to.equal(body.location);
    expect(response.image_url).to.equal(body.image_url);
    expect(response.recurring_pattern).to.equal(body.recurring_pattern);
  });

  it('PATCH /v1/events/{event_id}', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const response1: EventRes = await backend_client.events.postEvents(user_id, body);
    event_ids.push(response1.event_id);

    const patch: EventPatchReqBody = {
      title: 'Street Salsa 2',
    };

    const response2: EventRes = await backend_client.events.patchEvent(user_id, response1.event_id, patch);

    expect(response2.title).to.equal(patch.title);
  });

  it('GET /v1/events/{event_id} and GET /v1/events', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const number_of_items = 3;

    for (let i = 0; i < number_of_items; i++) {
      const { event_id } = await backend_client.events.postEvents(user_id, body);
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

  it('DELETE /v1/events/{event_id}', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { event_id }: EventRes = await backend_client.events.postEvents(user_id, body);

    await backend_client.events.postUpvotes(user_id, event_id);

    await backend_client.events.deleteEvent(user_id, event_id);

    try {
      await backend_client.events.getEvent(event_id);
      throw new Error('Event was not deleted');
    } catch (err: any | ApiError) {
      expect(err instanceof ApiError);
      expect(err.status).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it('POST /v1/events/{event_id}/images', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const access_token = await get_access_token();

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      recurring_pattern: RecurringPattern.NONE,
      coordinates: [49.0069, 8.4037]
    };

    const { event_id } = await backend_client.events.postEvents(user_id, body);
    event_ids.push(event_id);

    const filePath = __dirname + '/sample_data/sample.jpg';

    const formData = new FormData();

    formData.append('file', fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: 'image/jpg',
    });

    const headers = {
      'Authorization': `Bearer ${access_token}`,
      ...formData.getHeaders(), // Include the Content-Type header for multipart/form-data
    };

    const response2: AxiosResponse<ImageRes> = await axios.post(`http://localhost:8080/v1/users/${user_id}/events/${event_id}/images`, formData, {
      headers: headers,
    });

    expect(response2.data.url).to.include('cloudinary');
  });

  it('POST /v1/events/{event_id}/upvotes and POST /v1/events/{event_id}/downvotes', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { event_id } = await backend_client.events.postEvents(user_id, body);
    event_ids.push(event_id);

    await backend_client.events.postUpvotes(user_id, event_id);
    let res = await backend_client.events.getEvent(event_id);
    expect(res.upvotes_sum).to.equal(1);
    expect(res.downvotes_sum).to.equal(0);
    expect(res.votes_diff).to.equal(1);

    try {
      await backend_client.events.postUpvotes(user_id, event_id);
      throw new Error('postUpvotes should fail');
    } catch(err: any) {
      expect(err?.status === 400);
    }

    await backend_client.events.deleteUpvotes(user_id, event_id);
    res = await backend_client.events.getEvent(event_id);
    expect(res.upvotes_sum).to.equal(0);
    expect(res.downvotes_sum).to.equal(0);
    expect(res.votes_diff).to.equal(0);

    await backend_client.events.postDownvotes(user_id, event_id);
    res = await backend_client.events.getEvent(event_id);
    expect(res.upvotes_sum).to.equal(0);
    expect(res.downvotes_sum).to.equal(1);
    expect(res.votes_diff).to.equal(-1);

    await backend_client.events.deleteDownvotes(user_id, event_id);
  });

  it('GET /v1/users/events/upvotes and GET /v1/users/events/downvotes', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: EventReqBody = {
      unix_time: moment().add(1, 'week').toDate().getTime(),
      title: 'Street Salsa',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { event_id } = await backend_client.events.postEvents(user_id, body);
    event_ids.push(event_id);

    await backend_client.events.postUpvotes(user_id, event_id);
    let res = await backend_client.events.getUpvotes(user_id);
    expect(res.includes(event_id));

    await backend_client.events.deleteUpvotes(user_id, event_id);

    await backend_client.events.postDownvotes(user_id, event_id);
    res = await backend_client.events.getDownvotes(user_id);
    expect(res.includes(event_id));
  });

  after(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
    for (let i = 0; i < event_ids.length; i++) {
      await backend_client.events.deleteEvent(user_id, event_ids[i]);
    }
  });
});