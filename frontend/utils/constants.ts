import { OrderBy } from './backend_client';

export const COOKIE_KEYS = {
  LATITUDE: 'user_latitude',
  LONGITUDE: 'user_longitude',
  DISTANCE: 'distance',
  CITY: 'city',
  START_UNIX_TIME: 'start_unix_time',
  END_UNIX_TIME: 'end_unix_time',
  ORDER_BY: 'order_by',
  SELECTED_ITEM: 'selected_item'
};

export const SELECTED_ITEMS = {
  CHRONOLOGICAL: 'chronological',
  POPULAR_WEEKEND: 'popular_weekend',
  POPULAR_MONTH: 'popular_month',
  ALL_TIME_POPULAR: 'all_time_popular'
};

export const DEFAULT_USER_CONFIG = {
  latitude: 49.006889,
  longitude: 8.403653,
  distance: 50,
  city: 'Karlsruhe',
  orderBy: OrderBy.CHRONOLOGICAL,
  selectedItem: SELECTED_ITEMS.CHRONOLOGICAL
};

export const MILLISECONDS_IN_10_YEARS = 10 * 365.25 * 24 * 60 * 60 * 1000;

export const DATE_FORMAT = 'DD.MM.YYYY, HH:mm [Uhr]';
