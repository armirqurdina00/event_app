import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../.env/.dev_env` });
import { start_managing_events, Database } from '../helpers';
import { EventDownvoteE, EventE, EventUpvoteE } from '../commons/typeorm_entities';
import moment from 'moment';

describe('Tests for RecurringEventsJob.', function() {

  before(async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    if (process.env.NODE_ENV ==='DEVELOPMENT') {
      start_managing_events();
    } else {
      throw new Error('This test file can only be executed in \'DEVELOPMENT\' environment.');
    }
  });

  it('Delete old Events.', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const event = new EventE();
    event.created_by = 'test-user';
    event.title = 'test-title';
    event.unix_time = moment().subtract(1, 'week').toDate().getTime();
    event.location = 'test-location';
    event.recurring_pattern = 'NONE';

    const EventRepo = await Database.get_repo(EventE);
    const { event_id } = await EventRepo.save(event);

    const UpvoteRepo = await Database.get_repo(EventUpvoteE);
    await UpvoteRepo.save({
      event_id,
      user_id: 'placeholder'
    });

    const DownvoteRepo = await Database.get_repo(EventDownvoteE);
    await DownvoteRepo.save({
      event_id,
      user_id: 'placeholder'
    });

    await new Promise<void>(async (resolve) => {
      while (true) {
        const response = await EventRepo.findOne({
          where: { event_id }
        });
        if (response === null)
          resolve();
        else
          await sleep(1);
      }});
  });

  it('Update timestamp of one week old Event.', async function() {
    this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

    const event = new EventE();
    event.created_by = 'test-user';
    event.title = 'test-title';
    event.unix_time = moment().subtract(1, 'week').toDate().getTime();
    event.location = 'test-location';
    event.recurring_pattern = 'WEEKLY';

    const EventRepo = await Database.get_repo(EventE);
    const { event_id } = await EventRepo.save(event);

    await new Promise<void>(async (resolve) => {
      while (true) {
        const response = await EventRepo.findOne({
          where: { event_id }
        });
        if (moment(Number(response.unix_time)).format() === moment(event.unix_time).add(1, 'week').format())
          resolve();
        else
          await sleep(1);
      }});
  });
});

function sleep(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
