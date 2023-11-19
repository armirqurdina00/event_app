import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { expect } from 'chai';
import {
  BackendClient,
  GroupRes,
  GroupReqBody,
  GroupPatchReqBody,
  ApiError,
} from '../helpers-for-tests/backend_client';
import { get_access_token, get_user_id } from '../helpers-for-tests/auth';
import { HttpStatusCode } from '../commons/enums';
import { GroupJoinRes } from 'src/commons/TsoaTypes';

let backend_client: BackendClient;
const group_ids: string[] = [];
let user_id;

describe('Tests for groups endpoints.', function () {
  before(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    if (process.env.NODE_ENV === 'DEVELOPMENT') {
      const server = require('../index').default;
      await server;
    }

    backend_client = new BackendClient({
      BASE: process.env.BU_API_URL,
      TOKEN: get_access_token,
    });

    user_id = await get_user_id();
  });

  it('POST /v1/users/{user_id}/groups', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/whatsapp-group',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
    };

    const response: GroupRes = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(response.group_id);

    expect(response.title).to.equal(body.title);
    expect(response.description).to.equal(body.description);
    expect(response.location).to.equal(body.location);
    expect(response.locationUrl).to.equal(body.locationUrl);
  });

  it('get /v1/users/{user_id}/groups/{group_id}', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/whatsapp-group',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
    };

    const { group_id } = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(group_id);

    const response = await backend_client.groups.getUserGroup(user_id, group_id);

    expect(response.title).to.equal(body.title);
    expect(response.description).to.equal(body.description);
    expect(response.link).to.equal(body.link);
  });

  it('PATCH /v1/groups/{group_id}', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
    };

    const response1: GroupRes = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(response1.group_id);

    const patch: GroupPatchReqBody = {
      title: 'Street Salsa 2',
    };

    const response2: GroupRes = await backend_client.groups.patchGroup(user_id, response1.group_id, patch);

    expect(response2.title).to.equal(patch.title);
  });

  it('GET /v1/groups/{group_id} and GET /v1/groups', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
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

  it('GET /v1/groups returns only groups within the specified radius.', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const group_ids_inside: string[] = [];
    const group_ids_outside: string[] = [];

    const centerCoordinates = [8.4037, 49.0069]; // Center coordinates for search
    const [longitude, latitude] = centerCoordinates;
    const distance = 5; // 5 km

    // Unique titles for data independence
    const titleInside = `Group Inside ${Date.now()}`;
    const titleOutside = `Group Outside ${Date.now()}`;

    // Group data within the radius
    const bodyInsideRadius: GroupReqBody = {
      title: titleInside,
      description: titleInside,
      link: 'https://example.com/dance-party',
      location: 'Group Inside',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: centerCoordinates,
    };

    // Group data outside the radius
    const bodyOutsideRadius: GroupReqBody = {
      ...bodyInsideRadius,
      title: titleOutside,
      location: 'Group Outside',
      coordinates: [longitude + 0.1, latitude], // adjust to ensure outside the radius
    };

    const groupsInside = 3;
    const groupsOutside = 2;

    for (let i = 0; i < groupsInside; i++) {
      const { group_id } = await backend_client.groups.postGroups(user_id, bodyInsideRadius);
      group_ids_inside.push(group_id);
      group_ids.push(group_id);
    }

    for (let i = 0; i < groupsOutside; i++) {
      const { group_id } = await backend_client.groups.postGroups(user_id, bodyOutsideRadius);
      group_ids_outside.push(group_id);
      group_ids.push(group_id);
    }

    const response = await backend_client.groups.getGroups(1, 100, latitude, longitude, distance);

    // Assertions based on unique titles
    const returnedGroupsInside = response.items.filter(group => group.title === titleInside);
    const returnedGroupsOutside = response.items.filter(group => group.title === titleOutside);

    expect(returnedGroupsInside.length).to.equal(groupsInside);
    expect(returnedGroupsOutside.length).to.equal(0);
  });

  it('GET /v1/groups ordered by user_location', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const COORDINATES = [
      [49.0069, 8.4037],
      [49.007, 8.4038],
      [49.0071, 8.4039],
      [49.0072, 8.404],
      [49.0073, 8.4041],
      [49.0074, 8.4042],
      [49.0075, 8.4043],
      [49.0076, 8.4044],
      [49.0077, 8.4045],
      [49.0078, 8.4046],
    ];

    const createGroupWithRandomCoordinates = async () => {
      const requestBody: GroupReqBody = {
        title: 'Street Salsa',
        description: 'City Park',
        link: 'https://example.com/dance-party',
        location: 'City Park',
        locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
        coordinates: COORDINATES[Math.floor(Math.random() * COORDINATES.length)],
      };

      const response = await backend_client.groups.postGroups(user_id, requestBody);
      group_ids.push(response.group_id);
    };

    for (let i = 0; i < COORDINATES.length; i++) {
      await createGroupWithRandomCoordinates();
    }

    const PAGE = 1;
    const ITEMS_PER_PAGE = 2;
    const response = await backend_client.groups.getGroups(PAGE, ITEMS_PER_PAGE, COORDINATES[0][0], COORDINATES[0][1]);

    // Check if the returned items are in order of increasing distance from COORDINATES[0]
    let previousDistance = 0;
    response.items.forEach(item => {
      const currentDistance = getDistanceBetweenPoints(COORDINATES[0], item.coordinates); // Implement the getDistanceBetweenPoints function
      expect(currentDistance).to.be.at.least(previousDistance);
      previousDistance = currentDistance;
    });
  });

  it('DELETE /v1/groups/{group_id}', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/dance-party',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
    };

    const { group_id }: GroupRes = await backend_client.groups.postGroups(user_id, body);

    await backend_client.groups.postGroupJoin(user_id, group_id);

    await backend_client.groups.deleteGroup(user_id, group_id);

    try {
      await backend_client.groups.getGroup(group_id);
      throw new Error('Group was not deleted');
    } catch (err: any | ApiError) {
      expect(err instanceof ApiError);
      expect(err.status).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it('POST and GET /v1/groups/{group_id}/joins', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const body: GroupReqBody = {
      title: 'Street Salsa',
      description: 'City Park',
      link: 'https://example.com/whatsapp-group',
      location: 'City Park',
      locationUrl: 'https://www.google.com/maps?cid=8926798613940117231',
      coordinates: [8.4037, 49.0069],
    };

    const { group_id } = await backend_client.groups.postGroups(user_id, body);
    group_ids.push(group_id);

    const response_1: GroupJoinRes = await backend_client.groups.postGroupJoin(user_id, group_id);

    expect(response_1.user_id).to.equal(user_id);
    expect(response_1.group_id).to.equal(group_id);
    expect(response_1.link).to.equal(body.link);

    const response_2: GroupJoinRes = await backend_client.groups.getGroupJoin(user_id, group_id);

    expect(response_2.user_id).to.equal(user_id);
    expect(response_2.group_id).to.equal(group_id);
    expect(response_2.link).to.equal(body.link);
  });

  after(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
    for (let i = 0; i < group_ids.length; i++) {
      await backend_client.groups.deleteGroup(user_id, group_ids[i]);
    }
  });
});

function getDistanceBetweenPoints(point1, point2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = degToRad(point2[0] - point1[0]); // Difference in latitudes
  const dLon = degToRad(point2[1] - point1[1]); // Difference in longitudes

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(point1[0])) * Math.cos(degToRad(point2[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

function degToRad(deg) {
  return deg * (Math.PI / 180);
}
