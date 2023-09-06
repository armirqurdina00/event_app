import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Point } from 'typeorm';
import { RecurringPattern } from '../TsoaTypes';
import { EventUpvoteE } from './EventUpvoteE';
import { EventDownvoteE } from './EventDownvoteE';

@Entity()
export class EventE {
  @PrimaryGeneratedColumn('uuid')
  event_id: string;

  @Column({ type: 'bigint' })
  unix_time: number;

  @Column({ default: 'NONE' })
  recurring_pattern: RecurringPattern

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  location: string;

  @Column()
  locationUrl: string;

  @Column({
    type: 'point',
    transformer: { // need to use transformer as there's an active issue in typeorm with getter/setter of Point type: https://github.com/typeorm/typeorm/issues/2896
      from: v => { return { coordinates: [v?.x, v?.y] }; },
      to: v => `${v.coordinates[0]},${v.coordinates[1]}`, // [1,2] -> '1,2'
    },
  })
  location_point: Point;

  @Column({ default: 'https://res.cloudinary.com/dqolsfqjt/image/upload/v1692633904/placeholder-16x9-1_vp8x60.webp' })
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

  @Column({ nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => EventUpvoteE, 'event')
  upvotes: EventUpvoteE[];

  @OneToMany(() => EventDownvoteE, 'event')
  downvotes: EventDownvoteE[];
}