import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class ScheduleE {
  @PrimaryColumn({ type: 'timestamp' })
  runStart: Date;

  @Column({ type: 'timestamp' })
  runEnd: Date;

  @Column({ type: 'timestamp' })
  nextRun: Date;

  @Column({ nullable: true })
  errorMessage: string;
}
