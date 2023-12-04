import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../../../.env/.dev_env` });
import Scheduler from './Scheduler';
import sinon from 'sinon';
import FacebookCrawler from '../crawler/FacebookCrawler';
import { SchedulerConfig } from '../../commons/enums';
import TimeManager from '../crawler/TimeManager';
import { dataSource } from '../../helpers';
import { ScheduleE } from '../../commons/typeorm_entities/ScheduleE';
import moment from 'moment';
import { expect } from 'chai';

const SCHEDULER_CONFIG: SchedulerConfig = {
  RUNTIME_ADJUSTMENT_FACTOR: 0.3,
  DEFAULT_INTERVAL_IN_SECONDS: 30 * 60,
};

describe('Scheduler', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  before(async () => {
    await dataSource.initialize();
  });

  after(async () => {
    await dataSource.destroy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should save correct schedule when crawler succeeds', async () => {
    const timeManager = new TimeManager();
    const crawlerStub = sinon.createStubInstance(FacebookCrawler);
    crawlerStub.timeManager = timeManager;
    crawlerStub.run.resolves();

    const scheduler = new Scheduler(crawlerStub, SCHEDULER_CONFIG);
    const stubsaveSchedule = sinon.stub(scheduler, 'saveSchedule').resolves();

    await scheduler.deleteSchedules();
    await scheduler.run();

    const currentTime = timeManager.getCurrentTime();
    const toleranceInSeconds = 5;

    const expectedParams: Partial<ScheduleE> = {
      runStart: currentTime,
      runEnd: currentTime,
      nextRun: moment(currentTime)
        .add(SCHEDULER_CONFIG.DEFAULT_INTERVAL_IN_SECONDS * (1 - SCHEDULER_CONFIG.RUNTIME_ADJUSTMENT_FACTOR), 'seconds')
        .toDate(),
    };

    sinon.assert.calledOnce(stubsaveSchedule);
    const callArgs = stubsaveSchedule.firstCall.args[0];

    expect(isCloseEnough(callArgs.runStart, expectedParams.runStart, toleranceInSeconds)).to.be.true;
    expect(isCloseEnough(callArgs.runEnd, expectedParams.runEnd, toleranceInSeconds)).to.be.true;
    expect(isCloseEnough(callArgs.nextRun, expectedParams.nextRun, toleranceInSeconds)).to.be.true;
  });

  it('should save correct schedule when crawler fails', async () => {
    const timeManager = new TimeManager();
    const crawlerStub = sinon.createStubInstance(FacebookCrawler);
    crawlerStub.timeManager = timeManager;
    crawlerStub.run.throws(new Error('Test error'));

    const scheduler = new Scheduler(crawlerStub, SCHEDULER_CONFIG);
    const stubsaveSchedule = sinon.stub(scheduler, 'saveSchedule').resolves();

    await scheduler.deleteSchedules();
    await scheduler.run();

    const currentTime = timeManager.getCurrentTime();
    const toleranceInSeconds = 5;

    const expectedParams: Partial<ScheduleE> = {
      runStart: currentTime,
      runEnd: currentTime,
      nextRun: moment(currentTime)
        .add(SCHEDULER_CONFIG.DEFAULT_INTERVAL_IN_SECONDS * (1 + SCHEDULER_CONFIG.RUNTIME_ADJUSTMENT_FACTOR), 'seconds')
        .toDate(),
    };

    sinon.assert.calledOnce(stubsaveSchedule);
    const callArgs = stubsaveSchedule.firstCall.args[0];

    expect(isCloseEnough(callArgs.runStart, expectedParams.runStart, toleranceInSeconds)).to.be.true;
    expect(isCloseEnough(callArgs.runEnd, expectedParams.runEnd, toleranceInSeconds)).to.be.true;
    expect(isCloseEnough(callArgs.nextRun, expectedParams.nextRun, toleranceInSeconds)).to.be.true;
  });
});

function isCloseEnough(date1, date2, tolerance) {
  return Math.abs(moment(date1).diff(moment(date2), 'seconds')) <= tolerance;
}
