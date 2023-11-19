import { Entity, CreateDateColumn, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GroupE } from './GroupE';

@Entity()
export class GroupJoinE {
  @PrimaryColumn()
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  group_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => GroupE, 'joins')
  @JoinColumn({
    name: 'group_id',
    foreignKeyConstraintName: 'group_constraint',
  })
  group: GroupE;
}
