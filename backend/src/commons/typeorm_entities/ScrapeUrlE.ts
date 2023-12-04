import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { ScrapeUrlStatus, UrlType } from '../enums';
import moment from 'moment';

@Entity()
export class ScrapeUrlE {
  @PrimaryColumn()
  url: string;

  @Column({ type: 'enum', enum: UrlType, nullable: false })
  urlType: UrlType;

  @Column({ nullable: false })
  city: string;

  @Column({
    type: 'enum',
    enum: ScrapeUrlStatus,
    default: ScrapeUrlStatus.NOT_PROCESSED,
  })
  scrapeUrlStatus: ScrapeUrlStatus;

  @Column({ type: 'timestamp', nullable: true })
  expiry: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: moment().toDate() })
  nextScrape: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: moment().subtract(3, 'days').toDate() })
  lastScrape: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastFound: Date | null;

  @CreateDateColumn({ type: 'timestamp', nullable: true }) // This decorator creates a new timestamp column for entity insertion time
  createdAt: Date;
}
