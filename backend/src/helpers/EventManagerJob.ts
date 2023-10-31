import { Database } from './database';
import { EventDownvoteE, EventE, EventUpvoteE } from '../commons/typeorm_entities';
import moment from 'moment';
import { RecurringPattern } from '../helpers-for-tests/backend_client';
import { v2 as cloudinary } from 'cloudinary';

export async function start_managing_events() {
  setInterval(delete_old_events, Number(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS) * 1000);
  setInterval(update_recurrent_weekly_events, Number(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS) * 1000);
}

// todo: use db transaction to delete event and associated data
async function delete_old_events() {
  try {
    const data_source = await Database.get_data_source();

    const events = await data_source.getRepository(EventE).createQueryBuilder('event')
      .where('recurring_pattern = :recurring_pattern', { recurring_pattern: RecurringPattern.NONE })
      .andWhere('unix_time < :one_week_ago', { one_week_ago: moment().subtract(1, 'week').toDate().getTime() })
      .getMany();

    for (const i in events){
      const event_id = events[i].event_id;

      await cloudinary.uploader.destroy(event_id);

      await data_source.createQueryBuilder()
        .where('event_id = :event_id', { event_id })
        .delete()
        .from(EventDownvoteE)
        .execute();

      await data_source.createQueryBuilder()
        .where('event_id = :event_id', { event_id })
        .delete()
        .from(EventUpvoteE)
        .execute();
    }

    await data_source.createQueryBuilder()
      .where('recurring_pattern = :recurring_pattern', { recurring_pattern: RecurringPattern.NONE })
      .andWhere('unix_time < :one_week_ago', { one_week_ago: moment().subtract(1, 'week').toDate().getTime() })
      .delete()
      .from(EventE)
      .execute();

  } catch (error) {
    console.error('Error deleting old events:', error);
  }
}

async function update_recurrent_weekly_events() {
  try {

    const data_source = await Database.get_data_source();

    const events = await data_source.getRepository(EventE).createQueryBuilder('event')
      .where('event.recurring_pattern = :recurring_pattern', { recurring_pattern: 'WEEKLY' })
      .andWhere('event.unix_time < :eight_hours_ago', { eight_hours_ago: moment().subtract(8, 'hours').toDate().getTime() })
      .getMany();

    const updatedEvents = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      await data_source.createQueryBuilder()
        .where('event_id = :event_id', { event_id: event.event_id })
        .delete()
        .from(EventDownvoteE)
        .execute();

      await data_source.createQueryBuilder()
        .where('event_id = :event_id', { event_id: event.event_id })
        .delete()
        .from(EventUpvoteE)
        .execute();

      const newDate = moment(Number(event.unix_time)).add(1, 'week').toDate();
      event.unix_time = newDate.getTime();
      event.upvotes_sum = 0;
      event.downvotes_sum = 0;
      event.votes_diff = 0;
      updatedEvents.push(event);
    }

    await data_source.getRepository(EventE).save(updatedEvents);

  } catch (error) {
    console.error('Error updating recurring events:', error);
  }
}