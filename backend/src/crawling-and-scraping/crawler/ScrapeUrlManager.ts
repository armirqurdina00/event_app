import moment from 'moment';
import { ScrapeUrlManagerConfig, SCRAPE_RESULT, ScrapeUrlStatus, UrlType } from '../../commons/enums';
import TimeManager from './TimeManager';
import { ScrapeUrlE } from '../../commons/typeorm_entities';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { ScrapeUrlUpdate } from '../../commons/TsoaTypes';

class ScrapeUrlManager {
  private timeManager: TimeManager;
  private config: ScrapeUrlManagerConfig;
  private repo: Repository<ScrapeUrlE>;
  private statusForConstruction = new Set<ScrapeUrlStatus>([
    ScrapeUrlStatus.PROCESSED,
    ScrapeUrlStatus.FIRST_TIME_FAILED_TO_SCRAPE,
    ScrapeUrlStatus.MISSING_LOCATION,
    ScrapeUrlStatus.NOT_RELEVANT,
    ScrapeUrlStatus.IN_PAST,
    ScrapeUrlStatus.MISSING_COORDINATES,
    ScrapeUrlStatus.OUTSIDE_GROUP_PROXIMITY,
  ]);
  private statusForUpdate = new Set<ScrapeUrlStatus>([
    ScrapeUrlStatus.PROCESSED,
    ScrapeUrlStatus.FAILED_TO_SCRAPE,
    ScrapeUrlStatus.MISSING_LOCATION,
  ]);
  private statusForNextScrape = new Set<ScrapeUrlStatus>([
    ScrapeUrlStatus.PROCESSED,
    ScrapeUrlStatus.FIRST_TIME_FAILED_TO_SCRAPE,
    ScrapeUrlStatus.MISSING_LOCATION,
  ]);

  constructor(repo: Repository<ScrapeUrlE>, timeManager: TimeManager, config: ScrapeUrlManagerConfig) {
    this.timeManager = timeManager;
    this.repo = repo;
    this.config = config;
  }

  public async getScrapeUrls(scrapeUrls: string[]): Promise<ScrapeUrlE[]> {
    const scrapeUrlsE = await this.repo
      .createQueryBuilder('scrapeUrls')
      .select('scrapeUrls.url')
      .whereInIds(scrapeUrls)
      .getMany();

    return scrapeUrlsE;
  }

  public async getNextScrapeUrls(city: string, urlType: UrlType): Promise<ScrapeUrlE[]> {
    const now = this.timeManager.getCurrentTime();

    const scrapedEventUrls = await this.repo.find({
      where: [
        {
          city,
          urlType: urlType,
          scrapeUrlStatus: In([ScrapeUrlStatus.NOT_PROCESSED]),
        },
        {
          city,
          urlType: urlType,
          scrapeUrlStatus: In([...this.statusForNextScrape]),
          nextScrape: LessThanOrEqual(now),
        },
      ],
    });

    return scrapedEventUrls;
  }

  public async saveSearchUrl(url: string, city: string): Promise<ScrapeUrlE | null> {
    const scrapeUrlE: ScrapeUrlE = {
      url: url,
      urlType: UrlType.SEARCH_URL,
      city,
      scrapeUrlStatus: ScrapeUrlStatus.NOT_PROCESSED,
      nextScrape: this.timeManager.getCurrentTime(),
      lastScrape: null,
      lastFound: null,
      expiry: null,
      createdAt: this.timeManager.getCurrentTime(),
    };
    return await this.saveScrapeUrl(scrapeUrlE);
  }

  public async saveOrganizerUrl(url: string, city: string): Promise<ScrapeUrlE | null> {
    const scrapeUrlE: ScrapeUrlE = {
      url: url,
      urlType: UrlType.ORGANIZER_URL,
      city,
      scrapeUrlStatus: ScrapeUrlStatus.NOT_PROCESSED,
      nextScrape: this.timeManager.getCurrentTime(),
      lastScrape: null,
      lastFound: null,
      expiry: null,
      createdAt: this.timeManager.getCurrentTime(),
    };
    return await this.saveScrapeUrl(scrapeUrlE);
  }

  public async updateSearchUrl(url: string, scrapeResult: SCRAPE_RESULT) {
    return this.updateUrlStatusBasedOnResult(url, scrapeResult);
  }

  public async updateOrganizerUrl(url: string, scrapeResult: SCRAPE_RESULT) {
    return this.updateUrlStatusBasedOnResult(url, scrapeResult);
  }

  public async saveEventUrl(url: string, city: string, scrapeUrlStatus: ScrapeUrlStatus, eventStart?: Date) {
    const scrapeUrlE = await this.constructEventUrl(url, city, scrapeUrlStatus, eventStart);
    await this.repo.save(scrapeUrlE);
  }

  public async updateEventUrl(url: string, scrapeUrlStatus: ScrapeUrlStatus, eventStart?: Date) {
    const scrapeUrlE = await this.constructEventUrlUpdate(url, scrapeUrlStatus, eventStart);
    await this.repo.save(scrapeUrlE);
  }

  public async updateAllExpiredEventUrlStatus(city) {
    const currentTime = this.timeManager.getCurrentTime();

    await this.repo
      .createQueryBuilder()
      .update(ScrapeUrlE)
      .set({ scrapeUrlStatus: ScrapeUrlStatus.IN_PAST })
      .where('expiry <= :currentTime AND scrapeUrlStatus != :statusAlreadyInPast AND city = :city', {
        currentTime,
        statusAlreadyInPast: ScrapeUrlStatus.IN_PAST,
        city,
      })
      .execute();
  }

  // utils

  private constructEventUrl(
    url: string,
    city: string,
    scrapeUrlStatus: ScrapeUrlStatus,
    eventStart?: Date
  ): ScrapeUrlE {
    if (!this.statusForConstruction.has(scrapeUrlStatus))
      throw new Error(`Unallowed scrapeUrlStatus: ${scrapeUrlStatus}`);

    const now = this.timeManager.getCurrentTime();

    const urlType = UrlType.EVENT_URL;
    let nextScrape: Date | null;
    let lastScrape: Date | undefined;

    if (
      (this.statusForNextScrape.has(scrapeUrlStatus) &&
        scrapeUrlStatus === ScrapeUrlStatus.FIRST_TIME_FAILED_TO_SCRAPE) ||
      eventStart === undefined
    ) {
      nextScrape = moment(now).add(this.config.SECOND_TRY_TO_SCRAPE_EVENT_IN_DAYS, 'days').toDate();
    } else if (this.statusForNextScrape.has(scrapeUrlStatus)) {
      lastScrape = now;
      nextScrape = this.calculateNextScrapeTime(now, eventStart);
    } else {
      lastScrape = now;
      nextScrape = null;
    }

    const scrapeUrlE: ScrapeUrlE = {
      url,
      scrapeUrlStatus,
      nextScrape,
      urlType,
      city,
      expiry: eventStart ?? null,
      lastScrape: lastScrape ?? null,
      lastFound: lastScrape ?? null,
      createdAt: now,
    };

    return scrapeUrlE;
  }

  private constructEventUrlUpdate(url: string, scrapeUrlStatus: ScrapeUrlStatus, eventStart?: Date): ScrapeUrlUpdate {
    if (!this.statusForUpdate.has(scrapeUrlStatus)) throw new Error(`Unallowed scrapeUrlStatus: ${scrapeUrlStatus}`);

    const now = this.timeManager.getCurrentTime();

    let nextScrape: Date | null;
    let lastScrape: Date | undefined;

    if (this.statusForNextScrape.has(scrapeUrlStatus) && eventStart !== undefined) {
      lastScrape = now;
      nextScrape = this.calculateNextScrapeTime(now, eventStart);
    } else {
      nextScrape = null;
    }

    const scrapeUrlUpdate: ScrapeUrlUpdate = {
      url,
      scrapeUrlStatus,
      nextScrape,
    };
    if (lastScrape !== undefined) scrapeUrlUpdate.lastScrape = lastScrape;

    return scrapeUrlUpdate;
  }

  private calculateNextScrapeTime(now: Date, eventStart: Date): Date | null {
    const timeDifference = moment(eventStart).diff(now);

    if (timeDifference < 0) {
      throw new Error('Cannot calculate next scrape time for event in the past');
    }

    const dynamicScrapeTime = moment(now).add(
      timeDifference * this.config.EVENT_NEXT_SCRAPE_TIME_MULTIPLIER,
      'milliseconds'
    );
    const maxScrapeTime = moment(eventStart).subtract(this.config.LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS, 'days');

    // maxScrapeTime is the latest time we can scrape the event before it expires / takes place
    const nextScrapeTime = moment.min(dynamicScrapeTime, maxScrapeTime).toDate();

    if (this.isInPast(nextScrapeTime)) {
      return null;
    }
    if (this.wasScrapedRecently(nextScrapeTime)) {
      return null;
    }
    return nextScrapeTime;
  }

  private isInPast(date: Date): boolean {
    const now = this.timeManager.getCurrentTime();
    return moment(now).isAfter(date);
  }

  private wasScrapedRecently(nextScrape: Date): boolean {
    const now = this.timeManager.getCurrentTime();
    const diff = moment(nextScrape).diff(now, 'milliseconds');
    return diff < this.config.LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS * 24 * 60 * 60 * 1000;
  }

  private async saveScrapeUrl(scrapeUrl: ScrapeUrlE): Promise<ScrapeUrlE | null> {
    try {
      return await this.repo.save(scrapeUrl);
    } catch (error: any) {
      if (error.code === '23505') {
        console.error(`Scrape URL ${scrapeUrl.url} already exists`);
        return null;
      }
      throw error;
    }
  }

  async updateUrlStatusBasedOnResult(url, scrapeResult: SCRAPE_RESULT) {
    const urlUpdate = await this.constructUrlUpdate(url, scrapeResult);

    await this.repo.update({ url }, urlUpdate);
  }

  private async constructUrlUpdate(url, scrapeResult: SCRAPE_RESULT) {
    const currentTime = this.timeManager.getCurrentTime();
    const urlUpdate: Partial<ScrapeUrlE> = {
      lastScrape: currentTime,
    };

    if (scrapeResult !== SCRAPE_RESULT.STALE) {
      urlUpdate.scrapeUrlStatus = ScrapeUrlStatus.PROCESSED;
      urlUpdate.nextScrape = await this.determineNextScrape(url, scrapeResult);
      if (scrapeResult === SCRAPE_RESULT.EVENTS_FOUND) {
        urlUpdate.lastFound = currentTime;
      }
    } else {
      urlUpdate.scrapeUrlStatus = ScrapeUrlStatus.STALE;
    }

    return urlUpdate;
  }

  // Todo: I am not sure why originalInterval got negative sometimes. I added Math.abs() to fix it. Temporary fix.
  private async determineNextScrape(url, scrapeResult) {
    const currentTime = this.timeManager.getCurrentTime();
    const scrapeUrl = await this.repo.findOne({ where: { url } });

    if (scrapeUrl === null) throw new Error(`ScrapeUrl ${url} not found`);

    if (!scrapeUrl.lastScrape) {
      scrapeUrl.lastScrape = moment(currentTime)
        .subtract(this.config.LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS, 'days')
        .toDate();
    }

    if (moment(scrapeUrl.nextScrape).isBefore(moment(scrapeUrl.lastScrape)))
      console.error('nextScrape is before lastScrape'); // TODO: remove

    const adjustmentFactor = this.getAdjustmentFactor(scrapeResult);

    const originalInterval = Math.abs(moment(scrapeUrl.nextScrape).diff(moment(scrapeUrl.lastScrape), 'seconds')); // Todo: remove abs
    const adjustedInterval = Math.round(originalInterval * adjustmentFactor);
    const nextScrape = moment(currentTime).add(adjustedInterval, 'seconds').toDate();

    return nextScrape;
  }

  private getAdjustmentFactor(scrapeResult) {
    return scrapeResult === SCRAPE_RESULT.EVENTS_FOUND
      ? 1 - this.config.NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR
      : 1 + this.config.NEXT_SCRAPE_TIME_ADJUSTMENT_FACTOR;
  }
}

export default ScrapeUrlManager;
