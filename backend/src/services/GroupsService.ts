import { GroupRes, GroupsRes, GroupReqBody, GroupPatchReqBody } from '../commons/TsoaTypes';
import { GroupE } from '../commons/typeorm_entities';
import { OperationError } from '../helpers';
import { HttpStatusCode, GroupType } from '../commons/enums';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

export class GroupsService {
  private groupRepo: Repository<GroupE>;

  constructor(private dataSource: DataSource) {
    this.groupRepo = this.dataSource.getRepository(GroupE);
  }

  public async get_group(group_id: string): Promise<GroupRes> {
    const group = await this.find_group(group_id);

    if (!group) this.raise_group_not_found(group_id);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.as_group_response(group!);
  }

  public async get_groups(
    page: number,
    per_page: number,
    latitude?: number,
    longitude?: number,
    distance?: number,
    title?: string
  ): Promise<GroupsRes> {
    if ((latitude && longitude === undefined) || (longitude && latitude === undefined))
      throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

    if (distance && (latitude === undefined || longitude === undefined))
      throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

    const groups_e = await this.find_groups(page, per_page, latitude, longitude, distance, title);
    return await this.as_groups_response(groups_e, page, per_page);
  }

  public async post_group(user_id: string, req_body: GroupReqBody): Promise<GroupRes> {
    const group = await this.save_group(user_id, req_body);
    return this.as_group_response(group);
  }

  public async post_groups_joins(group_id): Promise<GroupRes> {
    const group = await this.find_group(group_id);

    if (group === null) this.raise_group_not_found(group_id);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const updatedGroup = await this.incrementGroupJoins(group!);

    return this.as_group_response(updatedGroup);
  }

  public async patch_group(user_id: string, group_id: string, req_body: GroupPatchReqBody): Promise<GroupRes> {
    let group = await this.find_group_by_user(user_id, group_id);

    if (!group) this.raise_group_not_found(group_id);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    group = await this.save_group(user_id, req_body, group!);
    return this.as_group_response(group);
  }

  public async delete_group(user_id: string, group_id: string): Promise<undefined> {
    const group = await this.find_group_by_user(user_id, group_id);

    if (!group) this.raise_group_not_found(group_id);

    await this.removeGroup(group_id);

    return;
  }

  async incrementGroupJoins(group: GroupE): Promise<GroupE> {
    await this.dataSource
      .createQueryBuilder()
      .update(GroupE)
      .set({
        number_of_joins: () => 'number_of_joins + 1',
      })
      .where('group_id = :group_id', { group_id: group.group_id })
      .execute();

    const upadatedGroup = { ...group };
    upadatedGroup.number_of_joins += 1;
    return upadatedGroup;
  }

  async save_group(user_id: string, req_body: GroupReqBody | GroupPatchReqBody, group?: GroupE): Promise<GroupE> {
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
        coordinates: [req_body.coordinates.longitude, req_body.coordinates.latitude],
      };
    }

    group = await this.groupRepo.save(group);

    return group;
  }

  async removeGroup(group_id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .where('group_id = :group_id', { group_id })
      .softDelete()
      .from(GroupE)
      .execute();
  }

  async find_group(group_id: string): Promise<GroupE | null> {
    const group = await this.groupRepo.findOne({
      where: { group_id },
    });
    return group;
  }

  async find_group_by_user(user_id: string, group_id: string): Promise<GroupE | null> {
    const group = await this.groupRepo.findOne({
      where: { group_id, created_by: user_id },
    });

    return group;
  }

  async find_groups(
    page: number,
    perPage: number,
    latitude?: number,
    longitude?: number,
    distance?: number,
    title?: string
  ): Promise<GroupE[]> {
    const offset = Math.max(perPage * (page - 1), 0);

    let query = this.initBaseGroupQuery();

    if (latitude !== undefined && longitude !== undefined) {
      query = this.applyLocationFilters(query, latitude, longitude, distance);
    }

    if (title) {
      query = query.andWhere('group.title LIKE :title', { title: `%${title}%` });
    }

    const groups = await query.limit(perPage).offset(offset).addOrderBy('updated_at', 'DESC').getMany();

    return groups;
  }

  initBaseGroupQuery(): SelectQueryBuilder<GroupE> {
    return this.groupRepo.createQueryBuilder('group');
  }

  applyLocationFilters(
    query: SelectQueryBuilder<GroupE>,
    latitude: number,
    longitude: number,
    distance?: number
  ): SelectQueryBuilder<GroupE> {
    if (distance) {
      const distance_in_m = distance * 1000;
      query = query.where(
        `ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326)::geography, ${distance_in_m})`
      );
    }
    return query.orderBy(`location_point <-> 'SRID=4326;POINT(${longitude} ${latitude})'`);
  }

  get_group_type(link: string): GroupType {
    if (link.includes('https://t.me')) {
      return GroupType.TELEGRAM;
    } else if (link.includes('whatsapp')) {
      return GroupType.WHATSAPP;
    } else {
      return GroupType.MISC;
    }
  }

  async get_number_of_groups(): Promise<number> {
    const query_result = await this.groupRepo.createQueryBuilder('group').select('COUNT(*)', 'count').getRawOne();

    return Number(query_result.count);
  }

  async as_groups_response(groups_e: GroupE[], page: number, per_page: number): Promise<GroupsRes> {
    return {
      page,
      per_page,
      total_number_of_items: await this.get_number_of_groups(),
      items: groups_e.map(g => this.as_group_response(g)),
    };
  }

  as_group_response(group_e: GroupE): GroupRes {
    const result = new GroupRes();

    result.group_id = group_e.group_id;
    result.title = group_e.title;
    result.description = group_e.description;
    result.type = this.get_group_type(group_e.link);
    result.location = group_e.location;
    result.locationUrl = group_e.locationUrl;
    result.location = group_e.location;
    result.locationUrl = group_e.locationUrl;
    result.coordinates = {
      latitude: group_e.location_point.coordinates[1],
      longitude: group_e.location_point.coordinates[0],
    };
    result.link = group_e.link;
    result.numberOfJoins = group_e.number_of_joins;
    result.created_by = group_e.created_by;
    result.created_at = group_e.created_at;
    result.updated_by = group_e.updated_by;
    result.updated_at = group_e.updated_at;

    return result;
  }

  raise_group_not_found(group_id) {
    throw new OperationError(`Group with id '${group_id}' not found.`, HttpStatusCode.NOT_FOUND);
  }
}
