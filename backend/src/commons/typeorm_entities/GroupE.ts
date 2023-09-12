import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { GroupUpvoteE } from './GroupUpvoteE';
import { GroupDownvoteE } from './GroupDownvoteE';
import { Point } from 'geojson';

@Entity()
export class GroupE {
  @PrimaryGeneratedColumn('uuid')
  group_id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  link: string;

  @Column()
  location: string;

  @Column()
  locationUrl: string;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326
  })
  location_point: Point

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

  @OneToMany(() => GroupUpvoteE, 'event')
  upvotes: GroupUpvoteE[];

  @OneToMany(() => GroupDownvoteE, 'event')
  downvotes: GroupDownvoteE[];
}