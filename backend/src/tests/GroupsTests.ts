import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import { BackendClient, GroupRes, GroupReqBody, GroupPatchReqBody } from '../helpers-for-tests/backend_client';
import { get_access_token } from '../helpers-for-tests/auth';

let backend_client: BackendClient;

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
  });

  it('POST /v1/groups', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/whatsapp-group'
    };

    const response: GroupRes = await backend_client.groups.postGroups(body);

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
    };

    const response1: GroupRes = await backend_client.groups.postGroups(body);

    const patch: GroupPatchReqBody = {
      title: 'Street Salsa 2',
    };

    const response2: GroupRes = await backend_client.groups.patchGroup(response1.group_id, patch);

    expect(response2.title).to.equal(patch.title);
  });

  it('GET /v1/groups/{group_id} and GET /v1/groups', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const group_ids = [];

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
    };

    const number_of_items = 3;

    for (let i = 0; i < number_of_items; i++) {
      const { group_id } = await backend_client.groups.postGroups(body);
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
    };

    const response: GroupRes = await backend_client.groups.postGroups(body);

    backend_client.groups.deleteGroup(response.group_id);
  });
});