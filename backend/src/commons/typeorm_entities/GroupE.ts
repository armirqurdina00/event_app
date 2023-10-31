import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { GroupJoinE } from './GroupJoinE';
import { Point } from 'geojson';

@Entity()
export class GroupE {
  @PrimaryGeneratedColumn('uuid')
  group_id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
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

  @Column({ default: 1 })
  number_of_joins: number;

  @Column()
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => GroupJoinE, 'group')
  joins: GroupJoinE[];
}