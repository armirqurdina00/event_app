import { SchedulerConfig } from '../../commons/enums';
import moment from 'moment';
import FacebookCrawler from '../crawler/FacebookCrawler';
import { dataSource } from '../../helpers';
import { ScheduleE } from '../../commons/typeorm_entities/ScheduleE';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'scheduler-service' },
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

export default class Scheduler {
  private config: SchedulerConfig;
  private crawler: FacebookCrawler;

  constructor(crawler: FacebookCrawler, config: SchedulerConfig) {
    this.crawler = crawler;
    this.config = config;
  }

  async run() {
    logger.info('Try to run scheduler.');
    const latestSchedule = await this.getLatestSchedule();
    const now = this.crawler.timeManager.getCurrentTime();
    if (latestSchedule !== null && latestSchedule.nextRun > now) {
      logger.info(
        `Scheduler is not due yet. Next run is in ${this.formatDuration(
          Math.abs(moment(latestSchedule.nextRun).diff(now, 'seconds'))
        )} at ${latestSchedule.nextRun}.`
      );
      return;
    }

    const runStart = now;
    let errorMessage: string | null = null;
    try {
      logger.info('Run crawler.');
      await this.crawler.run();
    } catch (err) {
      logger.error(err);
      if (err instanceof Error) {
        errorMessage = err.message;
      }
    }
    const runEnd = this.crawler.timeManager.getCurrentTime();

    let oldTimeDiffInSeconds: number;
    if (latestSchedule !== null) {
      oldTimeDiffInSeconds = Math.abs(moment(latestSchedule.nextRun).diff(latestSchedule.runEnd, 'seconds'));
    } else {
      oldTimeDiffInSeconds = this.config.DEFAULT_INTERVAL_IN_SECONDS;
    }

    let newTimeDiffInSeconds: number;
    if (errorMessage === null) {
      logger.info('Crawler succeeded. Decrease time difference between runs.');
      newTimeDiffInSeconds = oldTimeDiffInSeconds * (1 - this.config.RUNTIME_ADJUSTMENT_FACTOR);
    } else {
      logger.info('Crawler failed. Increase time difference between runs.');
      newTimeDiffInSeconds = oldTimeDiffInSeconds * (1 + this.config.RUNTIME_ADJUSTMENT_FACTOR);
    }

    logger.info('Save new schedule.');
    const newSchedule: Partial<ScheduleE> = {
      runStart,
      runEnd,
      nextRun: moment(runEnd).add(newTimeDiffInSeconds, 'seconds').toDate(),
    };
    if (errorMessage !== null) {
      newSchedule.errorMessage = errorMessage;
    }
    await this.saveSchedule(newSchedule as ScheduleE);

    logger.info(`Sleep for ${this.formatDuration(newTimeDiffInSeconds)}.`);
    return newTimeDiffInSeconds;
  }

  private async getLatestSchedule(): Promise<ScheduleE | null> {
    const scheduleRepo = dataSource.getRepository(ScheduleE);

    const [latestSchedule] = await scheduleRepo.find({ order: { runStart: 'DESC' }, take: 1 });

    return latestSchedule ?? null;
  }

  public async saveSchedule(data: ScheduleE): Promise<void> {
    const scheduleRepo = dataSource.getRepository(ScheduleE);

    const schedule = scheduleRepo.create(data);
    await scheduleRepo.save(schedule);
  }

  public async deleteSchedules(): Promise<void> {
    await dataSource.createQueryBuilder().delete().from(ScheduleE).execute();
  }

  private async sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  formatDuration(seconds: number): string {
    const duration = moment.duration(seconds, 'seconds');
    return `${duration.hours()} hours, ${duration.minutes()} minutes, ${duration.seconds()} seconds`;
  }
}
