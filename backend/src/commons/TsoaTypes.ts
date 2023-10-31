import { FieldErrors } from 'tsoa';
import { GroupType } from './enums';

export class GroupJoinRes {
  user_id: string
  group_id: string
  link: string
}

export type EventUpvoteRes = EventVoteRes

export type EventDownvoteRes = EventVoteRes

export interface EventVoteRes {
  event_id: string,
  user_id: string
}

export type RecurringPattern = 'WEEKLY' | 'NONE'

export interface ImageRes {
  url: string;
}

export interface GroupReqBody {
  title: string;
  description?: string;
  link?: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
}

export interface GroupPatchReqBody {
  title?: string;
  description?: string;
  link?: string;
  location?: string;
  locationUrl?: string;
  coordinates?: Array<number>;
}

export type UserGroupRes = GroupRes & { link: string };

export class GroupRes {
  group_id: string;
  title: string;
  description?: string;
  type: GroupType;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
  number_of_joins: number;
  created_by: string;
  created_at: Date;
  updated_by: string;
  updated_at: Date;
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

export interface EventReqBody {
  unix_time: UnixTime;
  recurring_pattern?: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
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
  coordinates?: Array<number>;
}

export class EventRes {
  event_id: string;
  unix_time: UnixTime;
  recurring_pattern: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
  image_url?: string | null;
  url?: string | null;
  upvotes_sum: number;
  downvotes_sum: number;
  votes_diff: number;
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