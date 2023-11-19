import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { start_managing_events, Database } from '../helpers';
import { EventDownvoteE, EventE, EventUpvoteE } from '../commons/typeorm_entities';
import moment from 'moment';

describe('Tests for RecurringEventsJob.', function () {
  before(async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    if (process.env.NODE_ENV === 'DEVELOPMENT') {
      start_managing_events();
    } else {
      throw new Error("This test file can only be executed in 'DEVELOPMENT' environment.");
    }
  });

  it('Delete old events.', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    // Setup
    const EventRepo = await Database.get_repo(EventE);
    const UpvoteRepo = await Database.get_repo(EventUpvoteE);
    const DownvoteRepo = await Database.get_repo(EventDownvoteE);

    const event = await createEvent(EventRepo);
    await addVote(UpvoteRepo, event.event_id);
    await addVote(DownvoteRepo, event.event_id);

    await waitForEventDeletion(EventRepo, UpvoteRepo, DownvoteRepo, event.event_id);
  });

  it('Update timestamp of weekly event.', async function () {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    // Setup
    const EventRepo = await Database.get_repo(EventE);
    const UpvoteRepo = await Database.get_repo(EventUpvoteE);
    const DownvoteRepo = await Database.get_repo(EventDownvoteE);

    const event = await createWeeklyEvent(EventRepo);
    await addVote(UpvoteRepo, event.event_id);
    await addVote(DownvoteRepo, event.event_id);

    // Test condition
    await waitForEventUpdate(EventRepo, UpvoteRepo, DownvoteRepo, event.event_id, event.unix_time);
  });
});

async function createEvent(EventRepo) {
  const event = new EventE();
  event.created_by = 'test-user';
  event.title = 'test-title';
  event.unix_time = moment().subtract(1, 'week').toDate().getTime();
  event.location = 'test-location';
  (event.locationUrl = 'https://www.google.com/maps?cid=8926798613940117231'), (event.recurring_pattern = 'NONE');
  event.location_point = {
    type: 'Point',
    coordinates: [8.4037, 49.0069],
  };

  const { event_id } = await EventRepo.save(event);

  return { ...event, event_id };
}

async function createWeeklyEvent(EventRepo) {
  const event = new EventE();
  event.created_by = 'test-user';
  event.title = 'test-title';
  event.unix_time = moment().subtract(1, 'week').toDate().getTime();
  event.location = 'test-location';
  (event.locationUrl = 'https://www.google.com/maps?cid=8926798613940117231'), (event.recurring_pattern = 'WEEKLY');
  event.location_point = {
    type: 'Point',
    coordinates: [8.4037, 49.0069],
  };

  const { event_id } = await EventRepo.save(event);

  return { ...event, event_id };
}

async function addVote(Repo, event_id) {
  return await Repo.save({
    event_id,
    user_id: 'placeholder',
  });
}

async function waitForEventDeletion(EventRepo, UpvoteRepo, DownvoteRepo, event_id) {
  while (true) {
    const found_event = await EventRepo.findOne({ where: { event_id } });
    const found_upvote = await UpvoteRepo.findOne({ where: { event_id } });
    const found_downvote = await DownvoteRepo.findOne({ where: { event_id } });

    if (!found_event && !found_upvote && !found_downvote) return;
    await sleep(1);
  }
}

async function waitForEventUpdate(EventRepo, UpvoteRepo, DownvoteRepo, event_id, originalTime) {
  while (true) {
    const response = await EventRepo.findOne({ where: { event_id } });

    const hasUpdatedTime = moment(Number(response.unix_time)).format() === moment(originalTime).add(1, 'week').format();
    const noUpvote = !(await UpvoteRepo.findOne({ where: { event_id } }));
    const noDownvote = !(await DownvoteRepo.findOne({ where: { event_id } }));

    if (hasUpdatedTime && noUpvote && noDownvote) return;

    await sleep(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
