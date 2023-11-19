import { Entity, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { EventE } from './EventE';

@Entity()
export class EventDownvoteE {
  @PrimaryColumn({ type: 'uuid' })
  event_id: string;

  @PrimaryColumn()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => EventE, 'downvotes')
  @JoinColumn({
    name: 'event_id',
    foreignKeyConstraintName: 'event_constraint',
  })
  event: EventE;
}
