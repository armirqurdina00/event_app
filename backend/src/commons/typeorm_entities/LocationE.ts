import { Column, Entity, Index, Point, PrimaryGeneratedColumn } from 'typeorm';
import { LocationType } from '../enums';

@Entity()
export class LocationE {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: LocationType,
  })
  type: LocationType;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point: Point;
}
