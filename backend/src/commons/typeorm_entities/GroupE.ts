import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Point } from 'typeorm';
import { GroupUpvoteE } from './GroupUpvoteE';
import { GroupDownvoteE } from './GroupDownvoteE';

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

  @Column({
    type: 'point',
    transformer: { // need to use transformer as there's an active issue in typeorm with getter/setter of Point type: https://github.com/typeorm/typeorm/issues/2896
      from: v => { return { coordinates: [v?.x, v?.y] }; },
      to: v => `${v.coordinates[0]},${v.coordinates[1]}`, // [1,2] -> '1,2'
    },
  })
  location_point: Point;

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