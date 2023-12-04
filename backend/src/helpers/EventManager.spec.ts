import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { dataSource } from '../helpers';
import { EventE } from '../commons/typeorm_entities';
import moment from 'moment';
import EventManager from './EventManager';
import { NodeEnv } from '../commons/enums';

let eventManager: EventManager;

describe('Tests for RecurringEventsJob.', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);
  before(async function () {
    if (!dataSource.isInitialized) await dataSource.initialize();

    eventManager = new EventManager(dataSource);

    if (process.env.NODE_ENV === NodeEnv.development) {
      eventManager.start();
    } else {
      throw new Error("This test file can only be executed in 'development' environment.");
    }

    this.eventRepo = await dataSource.getRepository(EventE);
  });

  after(async function () {
    await eventManager.stop();
    await dataSource.destroy();
  });

  it('Delete old events.', async function () {
    const event = await createEvent(this.eventRepo);

    await waitForEventDeletion(this.eventRepo, event.event_id);
  });

  it('Update timestamp of weekly event.', async function () {
    const event = await createWeeklyEvent(this.eventRepo);

    // Test condition
    await waitForEventUpdate(this.eventRepo, event.event_id, event.unix_time);
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

async function waitForEventDeletion(EventRepo, event_id) {
  while (true) {
    const found_event = await EventRepo.findOne({ where: { event_id } });

    if (!found_event) return;
    await sleep(1);
  }
}

async function waitForEventUpdate(EventRepo, event_id, originalTime) {
  while (true) {
    const response = await EventRepo.findOne({ where: { event_id } });

    const hasUpdatedTime = moment(Number(response.unix_time)).format() === moment(originalTime).add(1, 'week').format();

    if (hasUpdatedTime) return;

    await sleep(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
