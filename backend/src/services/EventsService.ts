import {
  EventReqBody,
  EventRes,
  EventsRes,
  EventPatchReqBody,
  ImageRes,
  EventVoteRes,
  EventIds,
} from '../commons/TsoaTypes';
import { EventUpvoteE, EventDownvoteE, EventE } from '../commons/typeorm_entities';
import { Database, OperationError } from '../helpers';
import { HttpStatusCode, Votes, OrderBy } from '../commons/enums';
import { v2 as cloudinary } from 'cloudinary';
import moment from 'moment';
import { Repository, SelectQueryBuilder } from 'typeorm';

// Events

export async function get_event(event_id: string): Promise<EventRes> {
  const event = await find_event(event_id);

  if (!event) raise_event_not_found(event_id);

  return as_event_response(event);
}

export async function get_events(
  page: number,
  per_page: number,
  latitude?: number,
  longitude?: number,
  distance?: number,
  title?: string,
  start_unix_time?: number,
  end_unix_time?: number,
  order_by?: OrderBy
): Promise<EventsRes> {
  if (start_unix_time && end_unix_time && end_unix_time < start_unix_time)
    throw new OperationError('End time must be after start time.', HttpStatusCode.BAD_REQUEST);

  if ((latitude && !longitude) || (longitude && !latitude))
    throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

  if (distance && (!latitude || !longitude)) throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

  const events_e = await find_events(page, per_page, latitude, longitude, distance, title, start_unix_time, end_unix_time, order_by);
  return await as_events_response(events_e, page, per_page);
}

export async function post_event(user_id: string, req_body: EventPatchReqBody): Promise<EventRes> {
  const existing_event = await find_event_by_coordinates_and_time(req_body.unix_time, req_body.coordinates);
  if (existing_event) raise_event_already_exists();

  const event = await save_event(null, user_id, req_body);
  return as_event_response(event);
}

export async function patch_event(user_id: string, event_id: string, req_body: EventPatchReqBody): Promise<EventRes> {
  let event = await find_event_by_user(user_id, event_id);

  if (!event) raise_event_not_found(event_id);

  event = await save_event(event_id, user_id, req_body);
  return as_event_response(event);
}

export async function delete_event(user_id: string, event_id: string): Promise<EventRes> {
  const event = await find_event_by_user(user_id, event_id);

  if (!event) raise_event_not_found(event_id);

  await remove_event_and_votes(event_id);

  return;
}

// Votes

export async function post_upvote(event_id: string, user_id: string): Promise<EventVoteRes> {
  const existing_downvote = await find_vote(event_id, user_id, Votes.DOWN);
  if (existing_downvote) raise_vote_already_exists();

  const existing_upvote = await find_vote(event_id, user_id, Votes.UP);
  if (existing_upvote) raise_vote_already_exists();

  await save_vote(event_id, user_id, Votes.UP);

  return {
    user_id,
    event_id,
  };
}

export async function get_user_upvotes(user_id: string): Promise<EventIds> {
  const userUpvotes = await find_user_votes(user_id, Votes.UP);
  return userUpvotes.map((v) => v.event_id);
}

export async function get_user_downvotes(user_id: string): Promise<EventIds> {
  const userDownvotes = await find_user_votes(user_id, Votes.DOWN);
  return userDownvotes.map((v) => v.event_id);
}

export async function get_upvotes(event_id: string): Promise<EventVoteRes[]> {
  const votes = await find_votes(event_id, Votes.UP);
  return votes;
}

export async function delete_upvote(event_id: string, user_id: string): Promise<void> {
  const vote = await find_vote(event_id, user_id, Votes.UP);

  if (!vote) raise_vote_not_found();

  await delete_vote(event_id, user_id, Votes.UP);
}

export async function post_downvote(event_id: string, user_id: string): Promise<EventVoteRes> {
  const existing_downvote = await find_vote(event_id, user_id, Votes.DOWN);
  if (existing_downvote) raise_vote_already_exists();

  const existing_upvote = await find_vote(event_id, user_id, Votes.UP);
  if (existing_upvote) raise_vote_already_exists();

  await save_vote(event_id, user_id, Votes.DOWN);

  return {
    user_id,
    event_id,
  };
}

export async function get_downvotes(event_id: string): Promise<EventVoteRes[]> {
  const downvotes = await find_votes(event_id, Votes.DOWN);
  return downvotes;
}

export async function delete_downvote(event_id: string, user_id: string): Promise<void> {
  const vote = await find_vote(event_id, user_id, Votes.DOWN);

  if (!vote) raise_vote_not_found();

  await delete_vote(event_id, user_id, Votes.DOWN);

  return;
}

// Images

export async function post_image(user_id: string, event_id: string, file: Express.Multer.File): Promise<ImageRes> {
  cloudinary.config({
    secure: true,
  });

  const event = await find_event_by_user(user_id, event_id);

  if (!event) raise_event_not_found(event_id);

  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

  const { url } = await cloudinary.uploader.upload(dataURI, {
    resource_type: 'auto',
    public_id: event_id,
  });

  return {
    url,
  };
}

// Private functions for Events

async function find_event(event_id: string): Promise<EventE> {
  const event_repo = await Database.get_repo(EventE);
  const event = await event_repo.findOne({
    where: { event_id },
  });
  return event;
}

async function find_event_by_user(user_id: string, event_id: string): Promise<EventE> {
  const event_repo = await Database.get_repo(EventE);
  const event = await event_repo.findOne({
    where: { event_id, created_by: user_id },
  });
  return event;
}

export async function find_event_by_coordinates_and_time(
  unix_time: number,
  coordinates: Array<number>
): Promise<EventE | null> {
  const event_repo = await Database.get_repo(EventE);

  const event = await event_repo
    .createQueryBuilder('event')
    .where('event.unix_time = :unix_time', { unix_time: unix_time })
    .andWhere(
      'ST_DWithin(event.location_point, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :distance)'
    )
    .setParameters({
      longitude: coordinates[0],
      latitude: coordinates[1],
      distance: 50,
    })
    .getOne();

  return event;
}

/**
 * Finds events based on pagination and ordering by location and votes.
 */
async function find_events(
  page: number,
  per_page: number,
  latitude?: number,
  longitude?: number,
  distance?: number,
  title?: string,
  start_unix_time?: number,
  end_unix_time?: number,
  order_by?: OrderBy
): Promise<EventE[]> {
  const offset = Math.max(per_page * page - per_page, 0);
  const eight_hours_ago = moment().subtract(8, 'hours').toDate().getTime();

  const event_repo = await Database.get_repo(EventE);
  let query = createBaseQuery(event_repo, eight_hours_ago, per_page, offset);

  if (latitude !== undefined && longitude !== undefined && distance !== undefined) {
    query = applyLocationFilters(query, latitude, longitude, distance);
  }

  if (title) {
    query = query.andWhere('event.title LIKE :title', { title: `%${title}%` });
  }

  if (start_unix_time !== undefined && end_unix_time !== undefined) {
    // Filter events within the provided time interval.
    query = query.andWhere('event.unix_time BETWEEN :start_unix_time AND :end_unix_time', {
      start_unix_time,
      end_unix_time
    });
  }

  if (order_by === OrderBy.Popularity)
    return query
      .orderBy('event.upvotes_sum', 'DESC')
      .getMany();
  else
    return query
      .orderBy('DATE_TRUNC(\'day\', TIMESTAMP WITH TIME ZONE \'epoch\' + event.unix_time * INTERVAL \'0.001 seconds\')', 'ASC')
      .addOrderBy('event.upvotes_sum', 'DESC')
      .getMany();
}

/**
 * Create the base query for events.
 */
function createBaseQuery(
  event_repo: Repository<EventE>,
  eight_hours_ago: number,
  per_page: number,
  offset: number
): SelectQueryBuilder<EventE> {
  return event_repo
    .createQueryBuilder('event')
    .limit(per_page)
    .offset(offset)
    .where('event.unix_time > :eight_hours_ago', { eight_hours_ago });
}

/**
 * Add location-based filters and ordering to the query.
 */
function applyLocationFilters(
  query: SelectQueryBuilder<EventE>,
  latitude: number,
  longitude: number,
  distance?: number
): SelectQueryBuilder<EventE> {
  const distance_in_m = distance * 1000;
  return query.andWhere(
    `ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326)::geography, ${distance_in_m})`
  );
}

// todo für patch und save eigene funktionen, damit link null gesetzt werden kann
export async function save_event(
  event_id: string,
  user_id: string,
  req_body: EventReqBody | EventPatchReqBody
): Promise<EventE> {
  let event = new EventE();
  if (event_id) event.event_id = event_id;
  if (user_id) event.created_by = user_id;
  if (user_id) event.updated_by = user_id;
  if (req_body.unix_time) event.unix_time = req_body.unix_time;
  if (req_body.title) event.title = req_body.title;
  if (req_body.description) event.description = req_body.description;
  if (req_body.location) event.location = req_body.location;
  if (req_body.locationUrl) event.locationUrl = req_body.locationUrl;
  if (req_body.coordinates) {
    event.location_point = {
      type: 'Point',
      coordinates: req_body.coordinates,
    };
  }
  if (req_body.image_url !== undefined) event.image_url = req_body.image_url;
  if (req_body.url !== undefined) event.url = req_body.url;
  if (req_body.recurring_pattern !== undefined) event.recurring_pattern = req_body.recurring_pattern;

  const EventRepo = await Database.get_repo(EventE);
  event = await EventRepo.save(event);

  return event;
}

async function remove_event_and_votes(event_id: string): Promise<void> {
  const data_source = await Database.get_data_source();

  await data_source.manager.transaction(async (tx_manager) => {
    await tx_manager
      .createQueryBuilder()
      .where('event_id = :event_id', { event_id })
      .delete()
      .from(EventDownvoteE)
      .execute();

    await tx_manager
      .createQueryBuilder()
      .where('event_id = :event_id', { event_id })
      .delete()
      .from(EventUpvoteE)
      .execute();

    await tx_manager.createQueryBuilder().where('event_id = :event_id', { event_id }).delete().from(EventE).execute();
  });
}

function as_event_response(event_e: EventE): EventRes {
  const result = new EventRes();

  result.event_id = event_e.event_id;
  result.unix_time = Number(event_e.unix_time);
  if (event_e.recurring_pattern) result.recurring_pattern = event_e.recurring_pattern;
  result.title = event_e.title;
  if (event_e.description) result.description = event_e.description;
  result.location = event_e.location;
  result.locationUrl = event_e.locationUrl;
  if (event_e.location_point) result.coordinates = event_e.location_point.coordinates;
  if (event_e.image_url) result.image_url = event_e.image_url;
  if (event_e.url) result.url = event_e.url;
  result.upvotes_sum = event_e.upvotes_sum;
  result.downvotes_sum = event_e.downvotes_sum;
  result.votes_diff = event_e.votes_diff;
  result.created_by = event_e.created_by;
  result.created_at = event_e.created_at;
  result.updated_by = event_e.updated_by;
  result.updated_at = event_e.updated_at;

  return result;
}

async function as_events_response(events_e: EventE[], page: number, per_page: number): Promise<EventsRes> {
  return {
    page,
    per_page,
    total_number_of_items: await get_number_of_events(),
    items: events_e.map((event_e) => as_event_response(event_e)),
  };
}

async function get_number_of_events(): Promise<number> {
  const event_repo = await Database.get_repo(EventE);

  const query_result = await event_repo.createQueryBuilder('event').select('COUNT(*)', 'count').getRawOne();

  return Number(query_result.count);
}

function raise_event_not_found(event_id) {
  throw new OperationError(`Event with id '${event_id}' not found.`, HttpStatusCode.NOT_FOUND);
}

// Private functions for Votes

async function find_vote(event_id: string, user_id: string, vote_type: Votes): Promise<EventVoteRes> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  const vote = await VoteRepo.findOne({
    where: { event_id, user_id },
  });
  return vote;
}

async function find_votes(event_id: string, vote_type: Votes): Promise<EventVoteRes[]> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  const votes = await VoteRepo.find({
    where: { event_id },
  });
  return votes;
}

async function find_user_votes(user_id: string, vote_type: Votes): Promise<EventVoteRes[]> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  const votes = await VoteRepo.find({
    where: { user_id },
  });
  return votes;
}

export async function save_vote(
  event_id: string,
  user_id: string,
  vote_type: Votes,
  number_of_votes = 1
): Promise<void> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  await VoteRepo.save({
    event_id,
    user_id,
    number_of_votes,
  });

  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        upvotes_sum: () => `upvotes_sum + ${number_of_votes}`,
        votes_diff: () => `votes_diff + ${number_of_votes}`,
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  } else {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        downvotes_sum: () => `downvotes_sum + ${number_of_votes}`,
        votes_diff: () => `votes_diff - ${number_of_votes}`,
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  }
}

async function delete_vote(event_id: string, user_id: string, vote_type: Votes): Promise<void> {
  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source.manager.transaction(async (tx_manager) => {
      await tx_manager
        .createQueryBuilder()
        .where('event_id = :event_id', { event_id })
        .andWhere('user_id = :user_id', { user_id })
        .delete()
        .from(EventUpvoteE)
        .execute();

      await tx_manager
        .createQueryBuilder()
        .update(EventE)
        .set({
          upvotes_sum: () => 'upvotes_sum - 1',
          votes_diff: () => 'votes_diff - 1',
        })
        .where('event_id = :event_id', { event_id })
        .execute();
    });
  } else {
    await data_source.manager.transaction(async (tx_manager) => {
      await tx_manager
        .createQueryBuilder()
        .where('event_id = :event_id', { event_id })
        .andWhere('user_id = :user_id', { user_id })
        .delete()
        .from(EventDownvoteE)
        .execute();

      await tx_manager
        .createQueryBuilder()
        .update(EventE)
        .set({
          downvotes_sum: () => 'downvotes_sum - 1',
          votes_diff: () => 'votes_diff + 1',
        })
        .where('event_id = :event_id', { event_id })
        .execute();
    });
  }
}

function raise_vote_not_found() {
  throw new OperationError('Vote not found.', HttpStatusCode.NOT_FOUND);
}

function raise_vote_already_exists() {
  throw new OperationError('Vote already exists.', HttpStatusCode.BAD_REQUEST);
}

function raise_event_already_exists() {
  throw new OperationError('Event already exists.', HttpStatusCode.BAD_REQUEST);
}
