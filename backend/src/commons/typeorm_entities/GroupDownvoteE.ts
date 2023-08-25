import { Entity, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { GroupE } from './GroupE';

@Entity()
export class GroupDownvoteE {
  @PrimaryColumn({ type: 'uuid' })
  group_id: string;

  @PrimaryColumn()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => GroupE, 'downvotes')
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'group_constraint' })
  group: GroupE;
}