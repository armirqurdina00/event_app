import { GroupRes, GroupsRes, GroupReqBody, GroupPatchReqBody, GroupJoinRes, UserGroupRes } from '../commons/TsoaTypes';
import { GroupE, GroupJoinE } from '../commons/typeorm_entities';
import { Database, OperationError } from '../helpers';
import { HttpStatusCode, GroupType } from '../commons/enums';
import { Repository, SelectQueryBuilder } from 'typeorm';

// Groups

export async function get_group(group_id: string): Promise<GroupRes> {
  const group = await find_group(group_id);

  if (!group)
    raise_group_not_found(group_id);

  return as_group_response(group);
}

export async function get_groups(page: number, per_page: number, latitude?: number, longitude?: number, distance?: number, title?: string): Promise<GroupsRes> {
  if ((latitude && !longitude) || (longitude && !latitude))
    throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

  if (distance && (!latitude || !longitude))
    throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

  const groups_e = await find_groups(page, per_page, latitude, longitude, distance, title);
  return await as_groups_response(groups_e, page, per_page);
}

export async function post_group(user_id: string, req_body: GroupReqBody): Promise<GroupRes> {
  const group = await save_group(user_id, req_body);
  return as_group_response(group);
}

export async function patch_group(user_id: string, group_id: string, req_body: GroupPatchReqBody): Promise<GroupRes> {
  let group = await find_group_by_user(user_id, group_id);

  if (!group)
    raise_group_not_found(group_id);

  group = await save_group(user_id, req_body, group);
  return as_group_response(group);
}

export async function delete_group(user_id: string, group_id: string): Promise<GroupRes> {

  const group = await find_group_by_user(user_id, group_id);

  if (!group)
    raise_group_not_found(group_id);

  await remove_group_and_joins(group_id);

  return;
}

export async function get_user_group(user_id: string, group_id: string): Promise<UserGroupRes> {

  const group = await find_group_by_user(user_id, group_id);

  if (!group)
    raise_group_not_found(group_id);

  return as_user_group_response(group);
}

export async function post_group_join(user_id: string, group_id: string): Promise<GroupJoinRes> {
  const group = await find_group(group_id);

  if (!group)
    raise_group_not_found(group_id);

  await save_group_join(user_id, group_id);

  return as_group_join_response(user_id, group_id, group.link);
}

export async function get_group_join(user_id: string, group_id: string): Promise<GroupJoinRes> {
  const group = await find_group(group_id);

  if (!group)
    raise_group_not_found(group_id);

  const group_join = await find_group_join_by_user(user_id, group_id);

  if (!group_join)
    raise_group_join_not_found(user_id, group_id);

  return as_group_join_response(user_id, group_id, group.link);
}

// Helpers

async function save_group(user_id: string, req_body: GroupReqBody | GroupPatchReqBody, group: GroupE = null): Promise<GroupE> {
  group ||= new GroupE();

  if (user_id) group.created_by = user_id;
  if (user_id) group.updated_by = user_id;
  if (req_body.title) group.title = req_body.title;
  if (req_body.description) group.description = req_body.description;
  if (req_body.link !== undefined) group.link = req_body.link;
  if (req_body.location) group.location = req_body.location;
  if (req_body.locationUrl) group.locationUrl = req_body.locationUrl;
  if (req_body.coordinates) {
    group.location_point = {
      type: 'Point',
      coordinates: req_body.coordinates,
    };
  }

  const groupRepo = await Database.get_repo(GroupE);
  group = await groupRepo.save(group);

  return group;
}

async function remove_group_and_joins(group_id: string): Promise<void> {
  const data_source = await Database.get_data_source();

  await data_source.manager.transaction(async tx_manager => {
    await tx_manager.createQueryBuilder()
      .where('group_id = :group_id', { group_id })
      .delete()
      .from(GroupJoinE)
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

async function find_group_by_user(user_id: string, group_id: string): Promise<GroupE> {
  const groupRepo = await Database.get_repo(GroupE);
  const group = await groupRepo.findOne({
    where: { group_id, created_by: user_id }
  });

  return group;
}

async function find_group_join_by_user(user_id: string, group_id: string): Promise<GroupJoinE> {
  const groupJoinRepo = await Database.get_repo(GroupJoinE);
  const group_join = await groupJoinRepo.findOne({
    where: { group_id, user_id }
  });
  return group_join;
}

async function find_groups(
  page: number,
  perPage: number,
  latitude?: number,
  longitude?: number,
  distance?: number,
  title?: string
): Promise<GroupE[]> {
  const offset = Math.max(perPage * (page - 1), 0);
  const groupRepo = await Database.get_repo(GroupE);

  let query = initBaseGroupQuery(groupRepo);

  if (latitude !== undefined && longitude !== undefined) {
    query = applyLocationFilters(query, latitude, longitude, distance);
  }

  if (title) {
    query = query.andWhere('group.title LIKE :title', { title: `%${title}%` });
  }

  const groups = await query
    .limit(perPage)
    .offset(offset)
    .addOrderBy('updated_at', 'DESC')
    .getMany();

  return groups;
}

function initBaseGroupQuery(groupRepo: Repository<GroupE>): SelectQueryBuilder<GroupE> {
  return groupRepo.createQueryBuilder('group');
}

function applyLocationFilters(query: SelectQueryBuilder<GroupE>, latitude: number, longitude: number, distance?: number): SelectQueryBuilder<GroupE> {
  if (distance) {
    const distance_in_m = distance * 1000;
    query = query.where(`ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326)::geography, ${distance_in_m})`);
  }
  return query.orderBy(`location_point <-> 'SRID=4326;POINT(${longitude} ${latitude})'`);
}

function get_group_type(link: string): GroupType {
  if (link.includes('https://t.me')) {
    return GroupType.TELEGRAM;
  } else if (link.includes('whatsapp')) {
    return GroupType.WHATSAPP;
  } else {
    return GroupType.MISC;
  }
}

async function get_number_of_groups(): Promise<number> {
  const group_repo = await Database.get_repo(GroupE);

  const query_result = await group_repo.createQueryBuilder('group')
    .select('COUNT(*)', 'count')
    .getRawOne();

  return Number(query_result.count);
}

async function save_group_join(user_id: string, group_id: string): Promise<void> {
  const GroupJoinRepo = await Database.get_repo(GroupJoinE);

  await GroupJoinRepo.save({
    user_id,
    group_id
  });

  const data_source = await Database.get_data_source();

  await data_source
    .createQueryBuilder()
    .update(GroupE)
    .set({
      number_of_joins: () => 'number_of_joins + 1',
    })
    .where('group_id = :group_id', { group_id })
    .execute();
}

function as_user_group_response(group_e: GroupE): UserGroupRes {

  const result = <UserGroupRes>as_group_response(group_e);

  result.link = group_e.link;

  return result;
}

function as_group_response(group_e: GroupE): GroupRes {
  const result = new GroupRes();

  result.group_id = group_e.group_id;
  result.title = group_e.title;
  result.description = group_e.description;
  result.type = get_group_type(group_e.link);
  result.location = group_e.location;
  result.locationUrl = group_e.locationUrl;
  result.location = group_e.location;
  result.locationUrl = group_e.locationUrl;
  result.coordinates = group_e.location_point.coordinates;
  result.number_of_joins = group_e.number_of_joins;
  result.created_by = group_e.created_by;
  result.created_at = group_e.created_at;
  result.updated_by = group_e.updated_by;
  result.updated_at = group_e.updated_at;

  return result;
}

function as_group_join_response(user_id: string, group_id: string, link: string): GroupJoinRes {
  const result = new GroupJoinRes();

  result.user_id = user_id;
  result.group_id = group_id;
  result.link = link;

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

function raise_group_not_found(group_id) {
  throw new OperationError(`Group with id '${group_id}' not found.`, HttpStatusCode.NOT_FOUND);
}

function raise_group_join_not_found(user_id:string, group_id:string) {
  throw new OperationError('User has not yet joined this group.', HttpStatusCode.NOT_FOUND);
}