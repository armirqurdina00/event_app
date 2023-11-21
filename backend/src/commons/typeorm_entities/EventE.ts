import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, Index } from 'typeorm';
import { RecurringPattern } from '../TsoaTypes';
import { EventUpvoteE } from './EventUpvoteE';
import { EventDownvoteE } from './EventDownvoteE';
import { Point } from 'geojson';

@Entity()
export class EventE {
  @PrimaryGeneratedColumn('uuid')
  event_id: string;

  @Column({ type: 'bigint' })
  unix_time: number;

  @Column({ default: 'NONE' })
  recurring_pattern!: RecurringPattern;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column()
  location: string;

  @Column()
  locationUrl: string;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location_point: Point;

  @Column({
    default: 'https://res.cloudinary.com/dqolsfqjt/image/upload/v1692633904/placeholder-16x9-1_vp8x60.webp',
  })
  image_url: string;

  @Column({ default: 0 })
  upvotes_sum: number;

  @Column({ default: 0 })
  downvotes_sum: number;

  @Column({ default: 0 })
  votes_diff: number;

  @Column()
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'varchar', nullable: true })
  updated_by: string | null;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToMany(() => EventUpvoteE, 'event')
  upvotes: EventUpvoteE[];

  @OneToMany(() => EventDownvoteE, 'event')
  downvotes: EventDownvoteE[];
}
