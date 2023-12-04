import { FieldErrors } from 'tsoa';
import { GroupType, ScrapeUrlStatus } from './enums';

export type ScrapeUrlUpdate = {
  url: string;
  scrapeUrlStatus: ScrapeUrlStatus;
  nextScrape: Date | null;
  lastScrape?: Date;
};

export type RecurringPattern = 'WEEKLY' | 'NONE';

export interface ImageRes {
  url: string;
}

export interface GroupReqBody {
  title: string;
  description?: string;
  link?: string;
  location: string;
  locationUrl: string;
  coordinates: Coordinates;
}

export interface GroupPatchReqBody {
  title?: string;
  description?: string;
  link?: string;
  location?: string;
  locationUrl?: string;
  coordinates?: Coordinates;
}

export interface GroupsRes {
  page: Page;
  per_page: PerPage;
  /**
   * @format int32
   */
  total_number_of_items: number;
  items: GroupRes[];
}

export class GroupRes {
  group_id: string;
  title: string;
  description?: string;
  type: GroupType;
  location: string;
  locationUrl: string;
  coordinates: Coordinates;
  link: string;
  numberOfJoins: number;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}

export interface EventReqBody {
  unix_time: UnixTime;
  recurring_pattern?: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Coordinates;
  image_url?: string;
  url?: string;
}

export interface EventPatchReqBody {
  unix_time?: UnixTime;
  recurring_pattern?: RecurringPattern;
  title?: string;
  description?: string;
  location?: string;
  locationUrl?: string;
  image_url?: string | null;
  url?: string | null;
  coordinates?: Coordinates;
}

export class Coordinates {
  latitude: number;
  longitude: number;
}

export class CoordinatesRes extends Coordinates {
  fromCache: boolean;
}

export class CityRes {
  name: string;
  fromCache: boolean;
}

export class EventRes {
  event_id: string;
  unix_time: UnixTime;
  recurring_pattern: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Coordinates;
  image_url?: string | null;
  url?: string | null;
  numberOfInterests: number;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
}

export interface EventsRes {
  page: Page;
  per_page: PerPage;
  /**
   * @format int32
   */
  total_number_of_items: number;
  items: EventRes[];
}

export interface LocationReqBody {
  address: string;
  latitude: number;
  longitude: number;
}

export interface HttpError {
  /**
   * @format int16
   */
  status: number;
  message: string;
}

export interface HttpBadRequestError {
  /**
   * @format int16
   */
  status: number;
  message: string;
  fields?: FieldErrors;
}

/**
 * In milliseconds since the Unix epoch.
 */
export type UnixTime = number;

/**
 * @format int32
 * @example 1
 */
export type Page = number;

/**
 * @format int32
 * @example 10
 */
export type PerPage = number;

export type GroupIds = GroupId[];

export type GroupId = string;

export type EventIds = EventId[];

export type EventId = string;
