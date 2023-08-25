import { Entity, CreateDateColumn, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GroupE } from './GroupE';

@Entity()
export class GroupUpvoteE {
  @PrimaryColumn({ type: 'uuid' })
  group_id: string;

  @PrimaryColumn()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => GroupE, 'upvotes')
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'group_constraint' })
  group: GroupE;
}