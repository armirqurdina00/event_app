import { FieldErrors } from 'tsoa';
import { Point } from 'typeorm';

export type GroupUpvoteRes = GroupVoteRes

export type GroupDownvoteRes = GroupVoteRes

export interface GroupVoteRes {
  group_id: string,
  user_id: string
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
  description: string;
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

export class GroupRes {
  group_id: string;
  title: string;
  description: string;
  link: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
  upvotes_sum: number;
  downvotes_sum: number;
  votes_diff: number;
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
  unix_time: number;
  recurring_pattern?: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
  image_url?: string;
}

export interface EventPatchReqBody {
  unix_time?: number;
  recurring_pattern?: RecurringPattern;
  title?: string;
  description?: string;
  location?: string;
  locationUrl?: string;
  image_url?: string | null;
  coordinates?: Array<number>;
}

export class EventRes {
  event_id: string;
  unix_time: number;
  recurring_pattern: RecurringPattern;
  title: string;
  description?: string;
  location: string;
  locationUrl: string;
  coordinates: Array<number>;
  image_url?: string | null;
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
 * @format int32
 */
export type Page = number;

/**
 * @format int32
 */
export type PerPage = number;

export type GroupIds = GroupId[];

export type GroupId = string;

export type EventIds = EventId[];

export type EventId = string;