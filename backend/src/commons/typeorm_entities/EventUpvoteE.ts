import { Entity, CreateDateColumn, JoinColumn, ManyToOne, PrimaryColumn, Column } from 'typeorm';
import { EventE } from './EventE';
import { GroupE } from './GroupE';

@Entity()
export class EventUpvoteE {
  @PrimaryColumn({ type: 'uuid' })
  event_id: string;

  @PrimaryColumn()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ default: 1 })
  number_of_votes: number;

  @ManyToOne(() => EventE, 'upvotes')
  @JoinColumn({
    name: 'event_id',
    foreignKeyConstraintName: 'event_constraint',
  })
  event: EventE;
}
