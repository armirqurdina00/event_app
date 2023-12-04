import { EventE } from '../commons/typeorm_entities';
import moment from 'moment';
import { RecurringPattern } from '../helpers-for-tests/backend_client';
import { v2 as cloudinary } from 'cloudinary';
import { DataSource } from 'typeorm';

export default class EventManager {
  private dataSource: DataSource;
  private deleteOldEventsIntervalId: NodeJS.Timer | null = null;
  private updateRecurrentEventsIntervalId: NodeJS.Timer | null = null;
  private ongoingOperations: Promise<any>[] = []; // Array to track ongoing operations

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  public start() {
    this.deleteOldEventsIntervalId = setInterval(
      this.delete_old_events.bind(this),
      Number(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS) * 1000
    );
    this.updateRecurrentEventsIntervalId = setInterval(
      this.update_recurrent_weekly_events.bind(this),
      Number(process.env.EVENT_UPDATE_INTERVAL_IN_SECONDS) * 1000
    );
  }

  public async stop() {
    if (this.deleteOldEventsIntervalId) {
      clearInterval(this.deleteOldEventsIntervalId);
      this.deleteOldEventsIntervalId = null;
    }
    if (this.updateRecurrentEventsIntervalId) {
      clearInterval(this.updateRecurrentEventsIntervalId);
      this.updateRecurrentEventsIntervalId = null;
    }

    await Promise.all(this.ongoingOperations);
  }

  // todo: use db transaction to delete event and associated data
  async delete_old_events() {
    const operation = (async () => {
      try {
        const events = await this.dataSource
          .getRepository(EventE)
          .createQueryBuilder('event')
          .where('recurring_pattern = :recurring_pattern', {
            recurring_pattern: RecurringPattern.NONE,
          })
          .andWhere('unix_time < :one_week_ago', {
            one_week_ago: moment().subtract(1, 'week').toDate().getTime(),
          })
          .getMany();

        for (const i in events) {
          const event_id = events[i].event_id;
          await cloudinary.uploader.destroy(event_id);
        }

        await this.dataSource
          .createQueryBuilder()
          .where('recurring_pattern = :recurring_pattern', {
            recurring_pattern: RecurringPattern.NONE,
          })
          .andWhere('unix_time < :one_week_ago', {
            one_week_ago: moment().subtract(1, 'week').toDate().getTime(),
          })
          .softDelete()
          .from(EventE)
          .execute();
      } catch (error) {
        console.error('Error soft deleting old events:', error);
      }
    })();
    this.ongoingOperations.push(operation);
    await operation;
    this.ongoingOperations = this.ongoingOperations.filter(op => op !== operation);
  }

  async update_recurrent_weekly_events() {
    const operation = (async () => {
      try {
        const events = await this.dataSource
          .getRepository(EventE)
          .createQueryBuilder('event')
          .where('event.recurring_pattern = :recurring_pattern', {
            recurring_pattern: 'WEEKLY',
          })
          .andWhere('event.unix_time < :eight_hours_ago', {
            eight_hours_ago: moment().subtract(8, 'hours').toDate().getTime(),
          })
          .getMany();

        const updatedEvents: EventE[] = [];

        for (let i = 0; i < events.length; i++) {
          const event = events[i];

          const newDate = moment(Number(event.unix_time)).add(1, 'week').toDate();
          event.unix_time = newDate.getTime();
          event.votes_diff = 0;
          updatedEvents.push(event);
        }

        await this.dataSource.getRepository(EventE).save(updatedEvents);
      } catch (error) {
        console.error('Error updating recurring events:', error);
      }
    })();
    this.ongoingOperations.push(operation);
    await operation;
    this.ongoingOperations = this.ongoingOperations.filter(op => op !== operation);
  }
}
