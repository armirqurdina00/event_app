import { expect } from 'chai';
import sinon, { SinonStubbedInstance } from 'sinon';
import { Repository } from 'typeorm';
import { ScrapeUrlE } from '../../commons/typeorm_entities';
import { SCRAPE_RESULT, ScrapeUrlManagerConfig, ScrapeUrlStatus, UrlType, } from '../../commons/enums';
import ScrapeUrlManager from './ScrapeUrlManager';
import TimeManager from './TimeManager';
import moment from 'moment';

describe('ScrapeUrlManager Functionality', function () {
  this.timeout(Number(process.env.TESTS_TIMEOUT_IN_SECONDS) * 1000);

  let scrapeUrlManager: ScrapeUrlManager;
  let scrapeUrlRepositoryStubs: SinonStubbedInstance<Repository<ScrapeUrlE>>;
  let timeManager: TimeManager;
  let scrapeUrlManagerConfig: ScrapeUrlManagerConfig;

  before(async function () {
    scrapeUrlRepositoryStubs = sinon.createStubInstance<any>(Repository<ScrapeUrlE>);
    timeManager = new TimeManager();
    scrapeUrlManagerConfig = {
      MIN_SCRAPE_TIME_DIFF_IN_DAYS: 2,
      NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR: 0.3,
    };
    scrapeUrlManager = new ScrapeUrlManager(timeManager, scrapeUrlRepositoryStubs, scrapeUrlManagerConfig);
  });

  afterEach(function () {
    scrapeUrlRepositoryStubs.save.reset();
    scrapeUrlRepositoryStubs.update.reset();
  });

  it('After scraping a search url and not finding new events, the next scrape should be done later.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';

    const existingScrapeUrl: ScrapeUrlE = {
      url: 'https://facebook.com/events/1234567890/',
      urlType: UrlType.SEARCH_URL,
      city: 'Karlsruhe',
      scrapeUrlStatus: ScrapeUrlStatus.PROCESSED,
      expiry: moment().add(30, 'days').toDate(),
      lastFound: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      lastScrape: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      nextScrape: new Date(),
      createdAt: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
    };

    scrapeUrlRepositoryStubs.findOne.resolves(existingScrapeUrl);
    await scrapeUrlManager.updateSearchUrl(eventUrl, SCRAPE_RESULT.NO_NEW_EVENTS_FOUND);

    expect(scrapeUrlRepositoryStubs.update.calledOnce).to.be.true;

    const actualArgs1 = scrapeUrlRepositoryStubs.update.getCall(0).args;
    const scrapeUrlEntity1 = actualArgs1[1];
    const scrapeInterval1 = moment(scrapeUrlEntity1.nextScrape as Date).diff(moment(scrapeUrlEntity1.lastScrape as Date), 'seconds');

    const lastScrapeTime1 = moment(scrapeUrlEntity1.lastScrape as Date);
    const nextScrapeTime1 = moment(scrapeUrlEntity1.nextScrape as Date);

    expect(lastScrapeTime1.isSame(moment(), 'second')).to.be.true;
    expect(nextScrapeTime1.isAfter(moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days'))).to.be.true;
    expect(scrapeInterval1).to.be.greaterThan(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 24 * 60 * 60);
  });

  it('After scraping a search url and finding new events, the next scrape should be done earlier.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';

    const existingScrapeUrl: ScrapeUrlE = {
      url: 'https://facebook.com/events/1234567890/',
      urlType: UrlType.SEARCH_URL,
      city: 'Karlsruhe',
      scrapeUrlStatus: ScrapeUrlStatus.PROCESSED,
      expiry: moment().add(30, 'days').toDate(),
      lastFound: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      lastScrape: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      nextScrape: new Date(),
      createdAt: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
    };

    scrapeUrlRepositoryStubs.findOne.resolves(existingScrapeUrl);
    await scrapeUrlManager.updateSearchUrl(eventUrl, SCRAPE_RESULT.EVENTS_FOUND);

    expect(scrapeUrlRepositoryStubs.update.calledOnce).to.be.true;

    const actualArgs1 = scrapeUrlRepositoryStubs.update.getCall(0).args;
    const scrapeUrlEntity1 = actualArgs1[1];
    const scrapeInterval1 = moment(scrapeUrlEntity1.nextScrape as Date).diff(moment(scrapeUrlEntity1.lastScrape as Date), 'seconds');

    const lastScrapeTime1 = moment(scrapeUrlEntity1.lastScrape as Date);
    const nextScrapeTime1 = moment(scrapeUrlEntity1.nextScrape as Date);

    expect(lastScrapeTime1.isSame(moment(), 'second')).to.be.true;
    expect(nextScrapeTime1.isBefore(moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days'))).to.be.true;
    expect(scrapeInterval1).to.be.lessThan(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 24 * 60 * 60);
  });

  it('After scraping a organizer url and not finding new events, the next scrape should be done later.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';

    const existingScrapeUrl: ScrapeUrlE = {
      url: 'https://facebook.com/events/1234567890/',
      urlType: UrlType.SEARCH_URL,
      city: 'Karlsruhe',
      scrapeUrlStatus: ScrapeUrlStatus.PROCESSED,
      expiry: moment().add(30, 'days').toDate(),
      lastFound: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      lastScrape: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      nextScrape: new Date(),
      createdAt: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
    };

    scrapeUrlRepositoryStubs.findOne.resolves(existingScrapeUrl);
    await scrapeUrlManager.updateOrganizerUrl(eventUrl, SCRAPE_RESULT.NO_NEW_EVENTS_FOUND);

    expect(scrapeUrlRepositoryStubs.update.calledOnce).to.be.true;

    const actualArgs1 = scrapeUrlRepositoryStubs.update.getCall(0).args;
    const scrapeUrlEntity1 = actualArgs1[1];
    const scrapeInterval1 = moment(scrapeUrlEntity1.nextScrape as Date).diff(moment(scrapeUrlEntity1.lastScrape as Date), 'seconds');

    const lastScrapeTime1 = moment(scrapeUrlEntity1.lastScrape as Date);
    const nextScrapeTime1 = moment(scrapeUrlEntity1.nextScrape as Date);

    expect(lastScrapeTime1.isSame(moment(), 'second')).to.be.true;
    expect(nextScrapeTime1.isAfter(moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days'))).to.be.true;
    expect(scrapeInterval1).to.be.greaterThan(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 24 * 60 * 60);
  });

  it('After scraping a organizer url and finding new events, the next scrape should be done earlier.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';

    const existingScrapeUrl: ScrapeUrlE = {
      url: 'https://facebook.com/events/1234567890/',
      urlType: UrlType.SEARCH_URL,
      city: 'Karlsruhe',
      scrapeUrlStatus: ScrapeUrlStatus.PROCESSED,
      expiry: moment().add(30, 'days').toDate(),
      lastFound: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      lastScrape: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
      nextScrape: new Date(),
      createdAt: moment().subtract(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days').toDate(),
    };

    scrapeUrlRepositoryStubs.findOne.resolves(existingScrapeUrl);
    await scrapeUrlManager.updateOrganizerUrl(eventUrl, SCRAPE_RESULT.EVENTS_FOUND);

    expect(scrapeUrlRepositoryStubs.update.calledOnce).to.be.true;

    const actualArgs1 = scrapeUrlRepositoryStubs.update.getCall(0).args;
    const scrapeUrlEntity1 = actualArgs1[1];
    const scrapeInterval1 = moment(scrapeUrlEntity1.nextScrape as Date).diff(moment(scrapeUrlEntity1.lastScrape as Date), 'seconds');

    const lastScrapeTime1 = moment(scrapeUrlEntity1.lastScrape as Date);
    const nextScrapeTime1 = moment(scrapeUrlEntity1.nextScrape as Date);

    expect(lastScrapeTime1.isSame(moment(), 'second')).to.be.true;
    expect(nextScrapeTime1.isBefore(moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS, 'days'))).to.be.true;
    expect(scrapeInterval1).to.be.lessThan(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 24 * 60 * 60);
  });

  it('After scraping an event for the first time, the next scrape time should be set to half the time until the event starts.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(30, 'days').toDate();
    const city = 'Karlsruhe';

    await scrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.PROCESSED);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    expect(scrapeUrlEntity.lastFound).be.a('Date');
    expect(scrapeUrlEntity.lastScrape).to.be.a('Date');

    const actualLastScrapeTime = moment(scrapeUrlEntity.lastScrape as Date);
    const actualNextScrapeTime = moment(scrapeUrlEntity.nextScrape as Date);
    const expectedLastScrapeTime = moment();
    const expectedNextScrapeTime = moment().add(15, 'days');

    expect(actualLastScrapeTime.isSame(expectedLastScrapeTime, 'day')).to.be.true;
    expect(actualNextScrapeTime.isSame(expectedNextScrapeTime, 'day')).to.be.true;
  });

  it('After scraping an event for the first time, the last scrape and last found time should be set to now.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(6, 'days').toDate();
    const city = 'Karlsruhe';

    await scrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.PROCESSED);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    const actualLastScrapeTime = moment(scrapeUrlEntity.lastScrape as Date);
    const actualLastFound = moment(scrapeUrlEntity.lastFound as Date);
    const expectedLastScrapeTime = moment();
    const expectedLastFound = moment();

    expect(actualLastFound.isSame(expectedLastFound, 'second')).to.be.true;
    expect(actualLastScrapeTime.isSame(expectedLastScrapeTime, 'day')).to.be.true;
  });

  it('After scraping an event for the first time, the scrape url scrapeUrlStatus: should be saved.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(6, 'days').toDate();
    const city = 'Karlsruhe';

    await scrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.FAILED_TO_PROCESS);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    expect(scrapeUrlEntity.scrapeUrlStatus).to.equal(ScrapeUrlStatus.FAILED_TO_PROCESS);
  });

  it('After scraping an event, the next scrape time should be set to half the time until the event starts.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(30, 'days').toDate();

    await scrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.PROCESSED);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    const actualLastScrapeTime = moment(scrapeUrlEntity.lastScrape as Date);
    const actualNextScrapeTime = moment(scrapeUrlEntity.nextScrape as Date);
    const expectedLastScrapeTime = moment();
    const expectedNextScrapeTime = moment().add(15, 'days');

    expect(actualLastScrapeTime.isSame(expectedLastScrapeTime, 'day')).to.be.true;
    expect(actualNextScrapeTime.isSame(expectedNextScrapeTime, 'day')).to.be.true;
  });

  it('After scraping an event, the last scrape time should be set to now.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(6, 'days').toDate();

    await scrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.PROCESSED);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    expect(scrapeUrlEntity.lastScrape).to.be.a('Date');

    const actualLastScrapeTime = moment(scrapeUrlEntity.lastScrape as Date);
    const expectedLastScrapeTime = moment();

    expect(actualLastScrapeTime.isSame(expectedLastScrapeTime, 'day')).to.be.true;
  });

  it('After scraping an event, the scrape url status should be updated.', async function () {
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(6, 'days').toDate();

    await scrapeUrlManager.updateEventUrl(eventUrl, eventStart, ScrapeUrlStatus.FAILED_TO_PROCESS);

    expect(scrapeUrlRepositoryStubs.save.calledOnce).to.be.true;

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    expect(scrapeUrlEntity.scrapeUrlStatus).to.equal(ScrapeUrlStatus.FAILED_TO_PROCESS);
  });

  it('After scraping an event shortly before start, the next scrape time should be set to null.', async function () {
    const city = 'Karlsruhe';
    const eventUrl = 'https://www.facebook.com/events/1234567890/';
    const eventStart = moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 1.9 * 24 * 60 * 60 * 1000, 'milliseconds').toDate();

    await scrapeUrlManager.saveEventUrl(eventUrl, city, eventStart, ScrapeUrlStatus.PROCESSED);

    const actualArgs = scrapeUrlRepositoryStubs.save.getCall(0).args;
    const scrapeUrlEntity = actualArgs[0];

    expect(scrapeUrlEntity.nextScrape).to.be.null;

    const eventStart2 = moment().add(scrapeUrlManagerConfig.MIN_SCRAPE_TIME_DIFF_IN_DAYS * 2.1 * 24 * 60 * 60 * 1000, 'milliseconds').toDate();

    await scrapeUrlManager.saveEventUrl(eventUrl, city, eventStart2, ScrapeUrlStatus.PROCESSED);

    const actualArgs2 = scrapeUrlRepositoryStubs.save.getCall(1).args;
    const scrapeUrlEntity2 = actualArgs2[0];

    expect(scrapeUrlEntity2.nextScrape).not.to.be.null;
  });
});
