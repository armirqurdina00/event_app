import { Entity, CreateDateColumn, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
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

  @ManyToOne(() => EventE, 'upvotes')
  @JoinColumn({ name: 'event_id', foreignKeyConstraintName: 'event_constraint' })
  event: EventE;
}