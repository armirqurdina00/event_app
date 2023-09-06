import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import { BackendClient, GroupRes, GroupReqBody, GroupPatchReqBody, ApiError } from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';
import { HttpStatusCode } from '../commons/enums';

let backend_client: BackendClient;
const group_ids = [];
let user_id;

describe('Tests for groups endpoints.', function() {

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

  it('POST /v1/groups', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/whatsapp-group',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const response: GroupRes = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(response.group_id);

    expect(response.title).to.equal(body.title);
    expect(response.description).to.equal(body.description);
    expect(response.link).to.equal(body.link);
  });

  it('PATCH /v1/groups/{group_id}', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const response1: GroupRes = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(response1.group_id);

    const patch: GroupPatchReqBody = {
      title: 'Street Salsa 2',
    };

    const response2: GroupRes = await backend_client.groups.patchGroup(user_id, response1.group_id, patch);

    expect(response2.title).to.equal(patch.title);
  });

  it('GET /v1/groups/{group_id} and GET /v1/groups', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const number_of_items = 3;

    for (let i = 0; i < number_of_items; i++) {
      const { group_id } = await backend_client.groups.postGroups(user_id, body);
      group_ids.push(group_id);
    }

    // ########################################
    // ########################################

    const response_1 = await backend_client.groups.getGroup(group_ids[0]);

    expect(response_1.title).to.equal(body.title);

    // ########################################
    // ########################################

    const page = 1;
    const per_page = 2;

    const response_2 = await backend_client.groups.getGroups(page, per_page);

    expect(response_2.page).to.be.a('number');
    expect(response_2.per_page).to.be.a('number');
    expect(response_2.total_number_of_items).to.be.a('number');
    expect(response_2.items).to.be.a('array');

    expect(response_2.page).to.equal(page);
    expect(response_2.per_page).to.equal(per_page);
    expect(response_2.total_number_of_items).to.be.above(number_of_items - 1);
  });

  it('DELETE /v1/groups/{group_id}', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { group_id }: GroupRes = await backend_client.groups.postGroups(user_id, body);

    await backend_client.groups.postUpvotes(user_id, group_id);

    await backend_client.groups.deleteGroup(user_id, group_id);

    try {
      await backend_client.groups.getGroup(group_id);
      throw new Error('Group was not deleted');
    } catch (err: any | ApiError) {
      expect(err instanceof ApiError);
      expect(err.status).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it('POST /v1/groups/{group_id}/upvotes and POST /v1/groups/{group_id}/downvotes', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { group_id } = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(group_id);

    await backend_client.groups.postUpvotes(user_id, group_id);
    let res = await backend_client.groups.getGroup(group_id);
    expect(res.upvotes_sum).to.equal(1);
    expect(res.downvotes_sum).to.equal(0);
    expect(res.votes_diff).to.equal(1);

    try {
      await backend_client.groups.postUpvotes(user_id, group_id);
      throw new Error('postUpvotes should fail');
    } catch(err: any) {
      expect(err?.status === 400);
    }

    await backend_client.groups.deleteUpvotes(user_id, group_id);
    res = await backend_client.groups.getGroup(group_id);
    expect(res.upvotes_sum).to.equal(0);
    expect(res.downvotes_sum).to.equal(0);
    expect(res.votes_diff).to.equal(0);

    await backend_client.groups.postDownvotes(user_id, group_id);
    res = await backend_client.groups.getGroup(group_id);
    expect(res.upvotes_sum).to.equal(0);
    expect(res.downvotes_sum).to.equal(1);
    expect(res.votes_diff).to.equal(-1);

    await backend_client.groups.deleteDownvotes(user_id, group_id);
  });

  it('GET /v1/users/groups/upvotes and GET /v1/users/groups/downvotes', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [49.0069, 8.4037]
    };

    const { group_id } = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(group_id);

    await backend_client.groups.postUpvotes(user_id, group_id);
    let res = await backend_client.groups.getUpvotes(user_id);
    expect(res.includes(group_id));

    await backend_client.groups.deleteUpvotes(user_id, group_id);

    await backend_client.groups.postDownvotes(user_id, group_id);
    res = await backend_client.groups.getDownvotes(user_id);
    expect(res.includes(group_id));
  });

  after(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
    for (let i = 0; i < group_ids.length; i++) {
      await backend_client.groups.deleteGroup(user_id, group_ids[i]);
    }
  });
});