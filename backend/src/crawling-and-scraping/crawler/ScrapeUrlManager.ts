import moment from 'moment';
import { ScrapeUrlManagerConfig, SCRAPE_RESULT, ScrapeUrlStatus, UrlType } from '../../commons/enums';
import TimeManager from './TimeManager';
import { ScrapeUrlE } from '../../commons/typeorm_entities';
import { In, LessThanOrEqual, Repository } from 'typeorm';

class ScrapeUrlManager {
  private TimeManager: TimeManager;
  private config: ScrapeUrlManagerConfig;
  private Repo: Repository<ScrapeUrlE>;

  constructor(TimeManager, ScrapeUrlRepository, config) {
    this.TimeManager = TimeManager;
    this.Repo = ScrapeUrlRepository;
    this.config = config;
  }

  public async getScrapeUrls(scrapeUrls: string[]): Promise<ScrapeUrlE[]> {
    const scrapeUrlsE = await this.Repo.createQueryBuilder('scrapeUrls')
      .select('scrapeUrls.url')
      .whereInIds(scrapeUrls)
      .getMany();

    return scrapeUrlsE;
  }

  public async getEligibleScrapeUrls(city: string, urlType: UrlType): Promise<ScrapeUrlE[]> {
    const now = this.TimeManager.getCurrentTime();

    const scrapedEventUrls = await this.Repo.find({
      where: [
        {
          city,
          urlType: urlType,
          scrapeUrlStatus: In([ScrapeUrlStatus.NOT_PROCESSED]),
        },
        {
          city,
          urlType: urlType,
          scrapeUrlStatus: In([ScrapeUrlStatus.PROCESSED]),
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
      nextScrape: this.TimeManager.getCurrentTime(),
      lastScrape: null,
      lastFound: null,
      expiry: null,
      createdAt: this.TimeManager.getCurrentTime(),
    };
    return await this.saveScrapeUrl(scrapeUrlE);
  }

  public async saveOrganizerUrl(url: string, city: string): Promise<ScrapeUrlE | null> {
    const scrapeUrlE: ScrapeUrlE = {
      url: url,
      urlType: UrlType.ORGANIZER_URL,
      city,
      scrapeUrlStatus: ScrapeUrlStatus.NOT_PROCESSED,
      nextScrape: this.TimeManager.getCurrentTime(),
      lastScrape: null,
      lastFound: null,
      expiry: null,
      createdAt: this.TimeManager.getCurrentTime(),
    };
    return await this.saveScrapeUrl(scrapeUrlE);
  }

  public async saveEventUrl(url: string, city: string, eventStart: Date | null, scrapeUrlStatus: ScrapeUrlStatus) {
    const scrapeUrlE = await this.constructEventUrl(url, city, eventStart, scrapeUrlStatus);
    await this.Repo.save(scrapeUrlE);
  }

  public async updateSearchUrl(url: string, scrapeResult: SCRAPE_RESULT) {
    return this.updateUrlStatusBasedOnResult(url, scrapeResult);
  }

  public async updateOrganizerUrl(url: string, scrapeResult: SCRAPE_RESULT) {
    return this.updateUrlStatusBasedOnResult(url, scrapeResult);
  }

  public async updateEventUrl(url: string, eventStart: Date | null, scrapeUrlStatus: ScrapeUrlStatus) {
    const scrapeUrlE = await this.constructEventUrlUpdate(url, eventStart, scrapeUrlStatus);
    await this.Repo.save(scrapeUrlE);
  }

  public async updateAllExpiredEventUrlStatus(city) {
    const currentTime = this.TimeManager.getCurrentTime();

    await this.Repo.createQueryBuilder()
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
    eventStart: Date | null,
    scrapeUrlStatus: ScrapeUrlStatus
  ): ScrapeUrlE {
    const now = this.TimeManager.getCurrentTime();

    const ScrapeUrl = new ScrapeUrlE();
    ScrapeUrl.url = url;
    ScrapeUrl.city = city;
    ScrapeUrl.urlType = UrlType.EVENT_URL;
    ScrapeUrl.expiry = eventStart;
    ScrapeUrl.scrapeUrlStatus = scrapeUrlStatus;

    if (scrapeUrlStatus === ScrapeUrlStatus.PROCESSED && eventStart !== null) {
      ScrapeUrl.lastFound = now;
      ScrapeUrl.lastScrape = now;
      ScrapeUrl.nextScrape = this.calculateNextScrapeTime(now, eventStart);
    } else if (scrapeUrlStatus === ScrapeUrlStatus.IN_PAST || scrapeUrlStatus === ScrapeUrlStatus.NOT_RELEVANT) {
      ScrapeUrl.lastScrape = now;
      ScrapeUrl.nextScrape = null;
    }

    return ScrapeUrl;
  }

  private constructEventUrlUpdate(url: string, eventStart: Date | null, scrapeUrlStatus: ScrapeUrlStatus): ScrapeUrlE {
    const now = this.TimeManager.getCurrentTime();

    const scrapeUrlR = new ScrapeUrlE();

    scrapeUrlR.url = url;
    scrapeUrlR.scrapeUrlStatus = scrapeUrlStatus;

    if (scrapeUrlStatus === ScrapeUrlStatus.PROCESSED && eventStart !== null) {
      scrapeUrlR.lastScrape = now;
      scrapeUrlR.nextScrape = this.calculateNextScrapeTime(now, eventStart);
    } else {
      scrapeUrlR.nextScrape = null;
    }

    return scrapeUrlR;
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
    const now = this.TimeManager.getCurrentTime();
    return moment(now).isAfter(date);
  }

  private wasScrapedRecently(nextScrape: Date): boolean {
    const now = this.TimeManager.getCurrentTime();
    const diff = moment(nextScrape).diff(now, 'milliseconds');
    return diff < this.config.LATEST_SCRAPE_TIME_BEFORE_EVENT_STARTS * 24 * 60 * 60 * 1000;
  }

  private async saveScrapeUrl(scrapeUrl: ScrapeUrlE): Promise<ScrapeUrlE | null> {
    try {
      return await this.Repo.save(scrapeUrl);
    } catch (error: any) {
      if (error.code === '23505') {
        console.error(`Scrape URL ${scrapeUrl.url} already exists`);
        return null;
      }
      throw error;
    }
  }

  async updateUrlStatusBasedOnResult(url, scrapeResult) {
    const updateData = await this.constructUpdateData(url, scrapeResult);

    await this.Repo.update({ url }, updateData);
  }

  private async constructUpdateData(url, scrapeResult: SCRAPE_RESULT) {
    const currentTime = this.TimeManager.getCurrentTime();
    const updateData: Partial<ScrapeUrlE> = {
      lastScrape: currentTime,
    };

    if (scrapeResult !== SCRAPE_RESULT.STALE) {
      updateData.scrapeUrlStatus = ScrapeUrlStatus.PROCESSED;
      updateData.nextScrape = await this.determineNextScrape(url, scrapeResult);
      if (scrapeResult === SCRAPE_RESULT.EVENTS_FOUND) {
        updateData.lastFound = currentTime;
      }
    } else {
      updateData.scrapeUrlStatus = ScrapeUrlStatus.STALE;
    }

    return updateData;
  }

  // Todo: I am not sure why originalInterval got negative sometimes. I added Math.abs() to fix it. Temporary fix.
  private async determineNextScrape(url, scrapeResult) {
    const currentTime = this.TimeManager.getCurrentTime();
    const scrapeUrl = await this.Repo.findOne({ where: { url } });

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
