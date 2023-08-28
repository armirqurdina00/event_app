import { GroupRes, GroupsRes, GroupReqBody, GroupPatchReqBody, GroupIds } from '../commons/TsoaTypes';
import { GroupDownvoteE, GroupE, GroupUpvoteE } from '../commons/typeorm_entities';
import { Database, OperationError } from '../helpers';
import { HttpStatusCode, Votes } from '../commons/enums';
import { GroupVoteRes } from 'src/helpers-for-tests/backend_client';

// Groups

export async function get_group(group_id: string): Promise<GroupRes> {
  const group = await find_group(group_id);

  if (!group)
    raise_group_not_found(group_id);

  return as_group_response(group);
}

export async function get_groups(page: number, per_page: number): Promise<GroupsRes> {
  const groups_e = await find_groups(page, per_page);
  return await as_groups_response(groups_e, page, per_page);
}

export async function post_group(user: string, req_body: GroupReqBody): Promise<GroupRes> {
  const group = await save_group(user, req_body);
  return as_group_response(group);
}

export async function patch_group(user: string, group_id: string, req_body: GroupPatchReqBody): Promise<GroupRes> {
  let group = await find_group_by_user(user, group_id);

  if (!group)
    raise_group_not_found(group_id);

  group = await save_group(user, req_body, group);
  return as_group_response(group);
}

export async function delete_group(user: string, group_id: string): Promise<GroupRes> {

  const group = await find_group_by_user(user, group_id);

  if (!group)
    raise_group_not_found(group_id);

  await remove_group_and_votes(group_id);

  return;
}

// Votes

export async function post_upvote(group_id: string, user_id: string): Promise<GroupVoteRes> {
  const existing_downvote = await find_vote(group_id, user_id, Votes.DOWN);
  if (existing_downvote)
    raise_vote_already_exists();

  const existing_upvote = await find_vote(group_id, user_id, Votes.UP);
  if (existing_upvote)
    raise_vote_already_exists();

  await save_vote(group_id, user_id, Votes.UP);

  return {
    user_id,
    group_id
  };
}

export async function get_user_upvotes(user_id: string): Promise<GroupIds> {
  const userUpvotes = await find_user_votes(user_id, Votes.UP);
  return userUpvotes.map(v => v.group_id);
}

export async function get_user_downvotes(user_id: string): Promise<GroupIds> {
  const userDownvotes = await find_user_votes(user_id, Votes.DOWN);
  return userDownvotes.map(v => v.group_id);
}

export async function delete_upvote(group_id: string, user_id: string): Promise<void> {

  const vote = await find_vote(group_id,user_id, Votes.UP);

  if (!vote)
    raise_vote_not_found();

  await delete_vote(group_id, user_id, Votes.UP);
}

export async function post_downvote(group_id: string, user_id: string): Promise<GroupVoteRes> {

  const existing_downvote = await find_vote(group_id, user_id, Votes.DOWN);
  if (existing_downvote)
    raise_vote_already_exists();

  const existing_upvote = await find_vote(group_id, user_id, Votes.UP);
  if (existing_upvote)
    raise_vote_already_exists();

  await save_vote(group_id, user_id, Votes.DOWN);

  return {
    user_id,
    group_id
  };
}

export async function delete_downvote(group_id: string, user_id: string): Promise<void> {

  const vote = await find_vote(group_id,user_id, Votes.DOWN);

  if (!vote)
    raise_vote_not_found();

  await delete_vote(group_id, user_id, Votes.DOWN);

  return;
}

// Private functions for Groups

async function save_group(user: string, req_body: GroupReqBody | GroupPatchReqBody, group: GroupE = null): Promise<GroupE> {
  group ||= new GroupE();

  if (user) group.created_by = user;
  if (req_body.title) group.title = req_body.title;
  if (req_body.description) group.description = req_body.description;
  if (req_body.link !== undefined) group.link = req_body.link;

  const groupRepo = await Database.get_repo(GroupE);
  group = await groupRepo.save(group);

  return group;
}

async function remove_group_and_votes(group_id: string): Promise<void> {
  const data_source = await Database.get_data_source();

  await data_source.manager.transaction(async tx_manager => {
    await tx_manager.createQueryBuilder()
      .where('group_id = :group_id', { group_id })
      .delete()
      .from(GroupDownvoteE)
      .execute();

    await tx_manager.createQueryBuilder()
      .where('group_id = :group_id', { group_id })
      .delete()
      .from(GroupUpvoteE)
      .execute();

    await tx_manager.createQueryBuilder()
      .where('group_id = :group_id', { group_id })
      .delete()
      .from(GroupE)
      .execute();
  });
}

async function find_group(group_id: string): Promise<GroupE> {
  const group_repo = await Database.get_repo(GroupE);
  const group = await group_repo.findOne({
    where: { group_id }
  });
  return group;
}

async function find_group_by_user(user: string, group_id: string): Promise<GroupE> {
  const groupRepo = await Database.get_repo(GroupE);
  const group = await groupRepo.findOne({
    where: { group_id, created_by: user }
  });

  return group;
}

async function find_groups(page: number, per_page: number): Promise<GroupE[]> {
  const offset = Math.max(per_page * (page - 1), 0);
  const limit = per_page;

  const group_repo = await Database.get_repo(GroupE);

  const groups = group_repo.createQueryBuilder('group')
    .limit(limit)
    .offset(offset)
    .orderBy('votes_diff', 'DESC')
    .getMany();

  return groups;
}

function as_group_response(group_e: GroupE): GroupRes {
  const result = new GroupRes();

  result.group_id = group_e.group_id;
  result.title = group_e.title;
  result.description = group_e.description;
  result.link = group_e.link;
  result.upvotes_sum = group_e.upvotes_sum;
  result.downvotes_sum = group_e.downvotes_sum;
  result.votes_diff = group_e.votes_diff;
  result.created_by = group_e.created_by;
  result.created_at = group_e.created_at;
  result.updated_by = group_e.updated_by;
  result.updated_at = group_e.updated_at;

  return result;
}

async function as_groups_response(groups_e: GroupE[], page: number, per_page: number): Promise<GroupsRes> {
  return {
    page,
    per_page,
    total_number_of_items: await get_number_of_groups(),
    items: groups_e.map(g => as_group_response(g))
  };
}

async function get_number_of_groups(): Promise<number> {
  const group_repo = await Database.get_repo(GroupE);

  const query_result = await group_repo.createQueryBuilder('group')
    .select('COUNT(*)', 'count')
    .getRawOne();

  return Number(query_result.count);
}

function raise_group_not_found(group_id) {
  throw new OperationError(`Group with id '${group_id}' not found.`, HttpStatusCode.NOT_FOUND);
}

// Private functions for Votes

async function find_vote(group_id: string, user_id: string, vote_type: Votes): Promise<GroupVoteRes> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(GroupUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(GroupDownvoteE);
  }

  const vote = await VoteRepo.findOne({
    where: { group_id, user_id }
  });
  return vote;
}

async function find_user_votes(user_id: string, vote_type: Votes): Promise<GroupVoteRes[]> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(GroupUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(GroupDownvoteE);
  }

  const votes = await VoteRepo.find({
    where: { user_id }
  });
  return votes;
}

async function save_vote(group_id: string, user_id: string, vote_type: Votes): Promise<void> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(GroupUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(GroupDownvoteE);
  }

  await VoteRepo.save({
    group_id,
    user_id
  });

  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source
      .createQueryBuilder()
      .update(GroupE)
      .set({
        upvotes_sum: () => 'upvotes_sum + 1',
        votes_diff: () => 'votes_diff + 1',
      })
      .where('group_id = :group_id', { group_id })
      .execute();
  } else {
    await data_source
      .createQueryBuilder()
      .update(GroupE)
      .set({
        downvotes_sum: () => 'downvotes_sum + 1',
        votes_diff: () => 'votes_diff - 1',
      })
      .where('group_id = :group_id', { group_id })
      .execute();
  }
}

async function delete_vote(group_id: string, user_id: string, vote_type: Votes): Promise<void> {
  let VoteRepo;

  if (vote_type === Votes.UP) {
    VoteRepo = await Database.get_repo(GroupUpvoteE);
  } else {
    VoteRepo = await Database.get_repo(GroupDownvoteE);
  }

  await VoteRepo.delete({
    group_id,
    user_id
  });

  const data_source = await Database.get_data_source();

  if (vote_type === Votes.UP) {
    await data_source
      .createQueryBuilder()
      .update(GroupE)
      .set({
        upvotes_sum: () => 'upvotes_sum - 1',
        votes_diff: () => 'votes_diff - 1',
      })
      .where('group_id = :group_id', { group_id })
      .execute();
  } else {
    await data_source
      .createQueryBuilder()
      .update(GroupE)
      .set({
        downvotes_sum: () => 'downvotes_sum - 1',
        votes_diff: () => 'votes_diff + 1',
      })
      .where('group_id = :group_id', { group_id })
      .execute();
  }
}

function raise_vote_not_found() {
  throw new OperationError('Vote not found.', HttpStatusCode.NOT_FOUND);
}

function raise_vote_already_exists() {
  throw new OperationError('Vote already exists.', HttpStatusCode.BAD_REQUEST);
}