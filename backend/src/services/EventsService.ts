import { EventReqBody, EventRes, EventsRes, EventPatchReqBody, ImageRes, Coordinates } from '../commons/TsoaTypes';
import { EventE } from '../commons/typeorm_entities';
import { OperationError } from '../helpers';
import { HttpStatusCode, OrderBy } from '../commons/enums';
import { v2 as cloudinary } from 'cloudinary';
import moment from 'moment';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

export class EventsService {
  private eventRepo: Repository<EventE>;

  constructor(private dataSource: DataSource) {
    this.eventRepo = this.dataSource.getRepository(EventE);
  }

  public async get_event(event_id: string): Promise<EventRes> {
    const event = await this.find_event(event_id);

    if (!event) this.raise_event_not_found(event_id);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.as_event_response(event!);
  }

  public async get_events(
    page: number,
    per_page: number,
    latitude?: number,
    longitude?: number,
    distance?: number,
    title?: string,
    start_unix_time?: number,
    end_unix_time?: number,
    order_by?: OrderBy
  ): Promise<EventsRes> {
    if (start_unix_time && end_unix_time && end_unix_time < start_unix_time)
      throw new OperationError('End time must be after start time.', HttpStatusCode.BAD_REQUEST);

    if ((latitude && longitude === undefined) || (longitude && latitude === undefined))
      throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

    if (distance && (latitude === undefined || longitude === undefined))
      throw new OperationError('Bad request.', HttpStatusCode.BAD_REQUEST);

    const events_e = await this.find_events(
      page,
      per_page,
      latitude,
      longitude,
      distance,
      title,
      start_unix_time,
      end_unix_time,
      order_by
    );
    return await this.as_events_response(events_e, page, per_page);
  }

  public async post_event(user_id: string, req_body: EventPatchReqBody): Promise<EventRes> {
    if (req_body.unix_time !== undefined && req_body.coordinates !== undefined) {
      const existing_event = await this.find_event_by_coordinates_and_time(req_body.unix_time, req_body.coordinates);
      if (existing_event) this.raise_event_already_exists();
    }

    const event = await this.save_event(null, user_id, req_body);
    return this.as_event_response(event);
  }

  public async post_event_interest(event_id: string): Promise<EventRes> {
    const event = await this.find_event(event_id);

    if (!event) this.raise_event_not_found(event_id);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const updatedEvent = await this.incrementEventInterests(event!);

    return this.as_event_response(updatedEvent);
  }

  public async patch_event(user_id: string, event_id: string, req_body: EventPatchReqBody): Promise<EventRes> {
    let event = await this.find_event_by_user(user_id, event_id);

    if (!event) this.raise_event_not_found(event_id);

    event = await this.save_event(event_id, user_id, req_body);
    return this.as_event_response(event);
  }

  public async delete_event(user_id: string, event_id: string): Promise<undefined> {
    const event = await this.find_event_by_user(user_id, event_id);

    if (!event) this.raise_event_not_found(event_id);

    await this.remove_event(event_id);

    return;
  }

  public async save_event(
    event_id: string | null,
    user_id: string,
    req_body: EventReqBody | EventPatchReqBody
  ): Promise<EventE> {
    let event = new EventE();
    if (event_id) event.event_id = event_id;
    if (user_id) event.created_by = user_id;
    if (user_id) event.updated_by = user_id;
    if (req_body.unix_time) event.unix_time = req_body.unix_time;
    if (req_body.title) event.title = req_body.title;
    if (req_body.description) event.description = req_body.description;
    if (req_body.location) event.location = req_body.location;
    if (req_body.locationUrl) event.locationUrl = req_body.locationUrl;
    if (req_body.coordinates) {
      event.location_point = {
        type: 'Point',
        coordinates: [req_body.coordinates.longitude, req_body.coordinates.latitude],
      };
    }
    if (req_body.image_url) event.image_url = req_body.image_url;
    if (req_body.url !== undefined) event.url = req_body.url;
    if (req_body.recurring_pattern !== undefined) event.recurring_pattern = req_body.recurring_pattern;

    event = await this.eventRepo.save(event);

    return event;
  }

  public async incrementEventInterests(event: EventE, amount = 1): Promise<EventE> {
    await this.dataSource
      .createQueryBuilder()
      .update(EventE)
      .set({
        votes_diff: () => `votes_diff + ${amount}`,
      })
      .where('event_id = :event_id', { event_id: event.event_id })
      .execute();

    const upadatedEvent = { ...event };
    upadatedEvent.votes_diff += 1;

    return upadatedEvent;
  }

  // Images

  public async post_image(user_id: string, event_id: string, file: Express.Multer.File): Promise<ImageRes> {
    cloudinary.config({
      secure: true,
    });

    const event = await this.find_event_by_user(user_id, event_id);

    if (!event) this.raise_event_not_found(event_id);

    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = 'data:' + file.mimetype + ';base64,' + b64;

    const { url } = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      public_id: event_id,
    });

    return {
      url,
    };
  }

  public async find_event_by_coordinates_and_time(unix_time: number, coordinates: Coordinates): Promise<EventE | null> {
    const event = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.unix_time = :unix_time', { unix_time: unix_time })
      .andWhere(
        'ST_DWithin(event.location_point, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :distance)'
      )
      .setParameters({
        longitude: coordinates.longitude,
        latitude: coordinates.latitude,
        distance: 50,
      })
      .getOne();
    return event;
  }

  // Private functions for Events

  async find_event(event_id: string): Promise<EventE | null> {
    const event = await this.eventRepo.findOne({
      where: { event_id },
    });
    return event;
  }

  async find_event_by_user(user_id: string, event_id: string): Promise<EventE | null> {
    const event = await this.eventRepo.findOne({
      where: { event_id, created_by: user_id },
    });
    return event;
  }

  /**
   * Finds events based on pagination and ordering by location and votes.
   */
  async find_events(
    page: number,
    per_page: number,
    latitude?: number,
    longitude?: number,
    distance?: number,
    title?: string,
    start_unix_time?: number,
    end_unix_time?: number,
    order_by?: OrderBy
  ): Promise<EventE[]> {
    const offset = Math.max(per_page * page - per_page, 0);
    const eight_hours_ago = moment().subtract(8, 'hours').toDate().getTime();

    let query = this.createBaseQuery(eight_hours_ago, per_page, offset);

    if (latitude !== undefined && longitude !== undefined && distance !== undefined) {
      query = this.applyLocationFilters(query, latitude, longitude, distance);
    }

    if (title) {
      query = query.andWhere('event.title LIKE :title', { title: `%${title}%` });
    }

    if (start_unix_time !== undefined && end_unix_time !== undefined) {
      // Filter events within the provided time interval.
      query = query.andWhere('event.unix_time BETWEEN :start_unix_time AND :end_unix_time', {
        start_unix_time,
        end_unix_time,
      });
    }

    if (order_by === OrderBy.Popularity) return query.orderBy('event.votes_diff', 'DESC').getMany();
    else
      return query
        .orderBy(
          "DATE_TRUNC('day', TIMESTAMP WITH TIME ZONE 'epoch' + event.unix_time * INTERVAL '0.001 seconds')",
          'ASC'
        )
        .addOrderBy('event.votes_diff', 'DESC')
        .getMany();
  }

  createBaseQuery(eight_hours_ago: number, per_page: number, offset: number): SelectQueryBuilder<EventE> {
    return this.eventRepo
      .createQueryBuilder('event')
      .limit(per_page)
      .offset(offset)
      .where('event.unix_time > :eight_hours_ago', { eight_hours_ago });
  }

  applyLocationFilters(
    query: SelectQueryBuilder<EventE>,
    latitude: number,
    longitude: number,
    distance: number
  ): SelectQueryBuilder<EventE> {
    const distance_in_m = distance * 1000;
    return query.andWhere(
      `ST_DWithin(location_point, ST_SetSRID(ST_MakePoint(${longitude},${latitude}),4326)::geography, ${distance_in_m})`
    );
  }

  async remove_event(event_id: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .where('event_id = :event_id', { event_id })
      .softDelete()
      .from(EventE)
      .execute();
  }

  as_event_response(event_e: EventE): EventRes {
    const result = new EventRes();

    result.event_id = event_e.event_id;
    result.unix_time = Number(event_e.unix_time);
    if (event_e.recurring_pattern) result.recurring_pattern = event_e.recurring_pattern;
    result.title = event_e.title;
    if (event_e.description) result.description = event_e.description;
    result.location = event_e.location;
    result.locationUrl = event_e.locationUrl;
    if (event_e.location_point)
      result.coordinates = {
        latitude: event_e.location_point.coordinates[1],
        longitude: event_e.location_point.coordinates[0],
      };
    if (event_e.image_url) result.image_url = event_e.image_url;
    if (event_e.url) result.url = event_e.url;
    result.numberOfInterests = event_e.votes_diff;
    result.created_by = event_e.created_by;
    result.created_at = event_e.created_at;
    if (event_e.updated_by) result.updated_by = event_e.updated_by;
    result.updated_at = event_e.updated_at;

    return result;
  }

  async as_events_response(events_e: EventE[], page: number, per_page: number): Promise<EventsRes> {
    return {
      page,
      per_page,
      total_number_of_items: await this.get_number_of_events(),
      items: events_e.map(event_e => this.as_event_response(event_e)),
    };
  }

  async get_number_of_events(): Promise<number> {
    const query_result = await this.eventRepo.createQueryBuilder('event').select('COUNT(*)', 'count').getRawOne();

    return Number(query_result.count);
  }

  raise_event_not_found(event_id) {
    throw new OperationError(`Event with id '${event_id}' not found.`, HttpStatusCode.NOT_FOUND);
  }

  raise_event_already_exists() {
    throw new OperationError('Event already exists.', HttpStatusCode.BAD_REQUEST);
  }
}
