import { EventReqBody, EventRes, EventsRes, EventPatchReqBody, ImageRes, EventVoteRes } from '../commons/TsoaTypes';
import { EventUpvoteE, EventDownvoteE, EventE } from '../commons/typeorm_entities';
import { Database, OperationError } from '../helpers';
import { HttpStatusCode, Votes } from '../commons/enums';
import { v2 as cloudinary } from 'cloudinary';
import moment from 'moment';

export async function post_event(user: string, req_body: EventPatchReqBody): Promise<EventRes> {

  const { event_id } = await save_event(null, user, req_body);

  const event = await find_event_by_user(user, event_id);

  const result = convert_event(event);

  return result;
}

export async function patch_event(user: string, event_id: string, req_body: EventPatchReqBody): Promise<EventRes> {

  const existing_event = await find_event_by_user(user, event_id);

  if (!existing_event)
    throw new OperationError(`Event with id '${event_id}'' not found.`, HttpStatusCode.NOT_FOUND);

  await save_event(event_id, null, req_body);

  const event = await find_event_by_user(user, event_id);

  const result = convert_event(event);

  return result;
}

export async function delete_event(user: string, event_id: string): Promise<EventRes> {

  const existing_event = await find_event_by_user(user, event_id);

  if (!existing_event)
    throw new OperationError(`Event with id '${event_id}'' not found.`, HttpStatusCode.NOT_FOUND);

  await remove_event(event_id);

  return;
}

export async function get_event(event_id: string): Promise<EventRes> {

  const event = await find_event(event_id);

  if (!event)
    throw new OperationError(`Event with id '${event_id}'' not found.`, HttpStatusCode.NOT_FOUND);

  const result = convert_event(event);

  return result;
}

export async function get_events(page: number, per_page: number): Promise<EventsRes> {

  const events_e = await find_events(page, per_page);

  const result = await convert_events(events_e, page, per_page);

  return result;
}

export async function post_image(event_id: string, file: Express.Multer.File): Promise<ImageRes> {
  cloudinary.config({
    secure: true
  });

  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

  const { url } = await cloudinary.uploader.upload(dataURI, {
    resource_type: 'auto',
    public_id: event_id
  });

  return {
    url
  };
}

export async function post_upvote(event_id: string, user_id: string): Promise<EventVoteRes> {

  const existing_downvote = await find_vote(event_id, user_id, Votes.DOWN);
  if (existing_downvote)
    throw new OperationError('Downvote does already exist.', HttpStatusCode.BAD_REQUEST);

  const existing_upvote = await find_vote(event_id, user_id, Votes.UP);
  if (existing_upvote)
    throw new OperationError('Upvote does already exist.', HttpStatusCode.BAD_REQUEST);

  await save_vote(event_id, user_id, Votes.UP);

  return {
    user_id,
    event_id
  };
}

export async function get_upvotes(event_id: string): Promise<EventVoteRes[]> {
  const upvotes = await find_votes(event_id, Votes.UP);
  return upvotes;
}

export async function delete_upvote(event_id: string, user_id: string): Promise<void> {

  const existing_upvote = await find_vote(event_id,user_id, Votes.UP);

  if (!existing_upvote)
    throw new OperationError('Upvote not found.', HttpStatusCode.NOT_FOUND);

  await delete_vote(event_id, user_id, Votes.UP);

  return;
}

export async function post_downvote(event_id: string, user_id: string): Promise<EventVoteRes> {

  const existing_downvote = await find_vote(event_id, user_id, Votes.DOWN);
  if (existing_downvote)
    throw new OperationError('Downvote does already exist.', HttpStatusCode.BAD_REQUEST);

  const existing_upvote = await find_vote(event_id, user_id, Votes.UP);
  if (existing_upvote)
    throw new OperationError('Upvote does already exist.', HttpStatusCode.BAD_REQUEST);

  await save_vote(event_id, user_id, Votes.DOWN);

  return {
    user_id,
    event_id
  };
}

export async function get_downvotes(event_id: string): Promise<EventVoteRes[]> {
  const downvotes = await find_votes(event_id, Votes.DOWN);
  return downvotes;
}

export async function delete_downvote(event_id: string, user_id: string): Promise<void> {

  const existing_downvote = await find_vote(event_id,user_id, Votes.DOWN);

  if (!existing_downvote)
    throw new OperationError('Downvote not found.', HttpStatusCode.NOT_FOUND);

  await delete_vote(event_id, user_id, Votes.DOWN);

  return;
}

async function find_event(event_id: string): Promise<EventE> {
  const event_repo = await Database.get_repo(EventE);
  const event = await event_repo.findOne({
    where: { event_id }
  });
  return event;
}

async function find_event_by_user(user: string, event_id: string): Promise<EventE> {
  const event_repo = await Database.get_repo(EventE);
  const event = await event_repo.findOne({
    where: { event_id, created_by: user }
  });
  return event;
}

async function find_events(page: number, per_page: number): Promise<EventE[]> {
  const offset = Math.max((per_page * page) - per_page, 0);
  const limit = per_page;

  const event_repo = await Database.get_repo(EventE);

  const events = event_repo.createQueryBuilder('event')
    .limit(limit)
    .offset(offset)
    .where('event.unix_time > :before_6_hours', { before_6_hours: moment().subtract(6, 'hours').toDate().getTime() })
    .orderBy('unix_time', 'ASC')
    .getMany();

  return events;
}

async function find_vote(event_id: string, user_id: string, vote_type: Votes): Promise<EventVoteRes> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  const vote = await VoteRepo.findOne({
    where: { event_id, user_id }
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
    where: { event_id }
  });
  return votes;
}

// todo: db transaction
async function save_vote(event_id: string, user_id: string, vote_type: Votes): Promise<void> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  await VoteRepo.save({
    event_id,
    user_id
  });

  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        upvotes_sum: () => 'upvotes_sum + 1',
        votes_diff: () => 'votes_diff + 1',
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  } else {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        downvotes_sum: () => 'downvotes_sum + 1',
        votes_diff: () => 'votes_diff - 1',
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  }
}

// todo: db transaction
async function delete_vote(event_id: string, user_id: string, vote_type: Votes): Promise<void> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(EventUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(EventDownvoteE);
  }

  await VoteRepo.delete({
    event_id,
    user_id
  });

  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        upvotes_sum: () => 'upvotes_sum - 1',
        votes_diff: () => 'votes_diff - 1',
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  } else {
    await data_source
      .createQueryBuilder()
      .update(EventE)
      .set({
        downvotes_sum: () => 'downvotes_sum - 1',
        votes_diff: () => 'votes_diff + 1',
      })
      .where('event_id = :event_id', { event_id })
      .execute();
  }
}

// todo für patch und save eigene funktionen, damit link null gesetzt werden kann
async function save_event(event_id: string, user: string, req_body: EventReqBody | EventPatchReqBody): Promise<EventE> {

  let event = new EventE();
  if (event_id) event.event_id = event_id;
  if (user) event.created_by = user;
  if (req_body.unix_time) event.unix_time = req_body.unix_time;
  if (req_body.title) event.title = req_body.title;
  if (req_body.location) event.location = req_body.location;
  if (req_body.link !== undefined) event.link = req_body.link;
  if (req_body.image_url !== undefined) event.image_url = req_body.image_url;
  if (req_body.recurring_pattern !== undefined) event.recurring_pattern = req_body.recurring_pattern;

  const EventRepo = await Database.get_repo(EventE);
  event = await EventRepo.save(event);

  return event;
}

async function remove_event(event_id: string): Promise<void> {
  const EventRepo = await Database.get_repo(EventE);
  await EventRepo.delete({ event_id });
}

function convert_event(event_e: EventE): EventRes {
  const result = new EventRes();

  result.event_id = event_e.event_id;
  result.unix_time = Number(event_e.unix_time);
  if (event_e.recurring_pattern)
    result.recurring_pattern = event_e.recurring_pattern;
  result.title = event_e.title;
  result.location = event_e.location;
  if (event_e.link)
    result.link = event_e.link;
  if (event_e.image_url)
    result.image_url = event_e.image_url;
  result.upvotes_sum = event_e.upvotes_sum;
  result.downvotes_sum = event_e.downvotes_sum;
  result.votes_diff = event_e.votes_diff;
  result.created_by = event_e.created_by;
  result.created_at = event_e.created_at;
  result.updated_by = event_e.updated_by;
  result.updated_at = event_e.updated_at;

  return result;
}

async function convert_events(events_e: EventE[], page: number, per_page: number): Promise<EventsRes> {

  const new_events = events_e.map(event_e => {
    return convert_event(event_e);
  });

  const result = {
    page,
    per_page,
    total_number_of_items: await get_number_of_events(),
    items: new_events
  };

  return result;
}

async function get_number_of_events(): Promise<number> {
  const event_repo = await Database.get_repo(EventE);

  const query_result = await event_repo.createQueryBuilder('event')
    .select('COUNT(*)', 'count')
    .getRawOne();

  const result = Number(query_result.count);

  return result;
}