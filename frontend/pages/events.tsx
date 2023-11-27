import React, { useState, useEffect, useRef } from 'react';
import EventCard from '@/components/event-card';
import {
  type EventsRes,
  type EventRes,
  OrderBy,
} from '../utils/backend_client';
import { useRouter } from 'next/router';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useUserConfig } from '@/hooks/useUserConfig';
import { COOKIE_KEYS, SELECTED_ITEMS } from '../utils/constants';
import cookie from 'cookie';
import moment from 'moment';
import TopNav from '@/components/top-nav';
import BottomNav from '@/components/bottom-nav';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from 'next-i18next';
import { useTranslation } from 'next-i18next';

const PAGE_SIZE = 20;
const PAGE = 1;

const parseCookies = (cookieString) => {
  return cookie.parse(cookieString || '');
};

const getLocationDataFromCookies = (cookies) => {
  return {
    latitude: Number(cookies[COOKIE_KEYS.LATITUDE]),
    longitude: Number(cookies[COOKIE_KEYS.LONGITUDE]),
    distance: Number(cookies[COOKIE_KEYS.DISTANCE]),
  };
};

const getFilterDataFromCookies = (cookies) => {
  return {
    startUnixTime:
      cookies[COOKIE_KEYS.START_UNIX_TIME] !== 'null' &&
      cookies[COOKIE_KEYS.START_UNIX_TIME] !== 'undefined' &&
      cookies[COOKIE_KEYS.START_UNIX_TIME] !== undefined
        ? String(cookies[COOKIE_KEYS.START_UNIX_TIME])
        : null,
    endUnixTime:
      cookies[COOKIE_KEYS.END_UNIX_TIME] !== 'null' &&
      cookies[COOKIE_KEYS.END_UNIX_TIME] !== 'undefined' &&
      cookies[COOKIE_KEYS.END_UNIX_TIME] !== undefined
        ? String(cookies[COOKIE_KEYS.END_UNIX_TIME])
        : null,
    orderBy:
      cookies[COOKIE_KEYS.ORDER_BY] !== 'null' &&
      cookies[COOKIE_KEYS.ORDER_BY] !== 'undefined' &&
      cookies[COOKIE_KEYS.ORDER_BY] !== undefined
        ? String(cookies[COOKIE_KEYS.ORDER_BY])
        : null,
  };
};

const fetchInitialEvents = async (
  latitude,
  longitude,
  distance,
  startUnixTime,
  endUnixTime,
  orderBy
) => {
  const BASE_URL = process.env.BACKEND_URL;
  let url = `${BASE_URL}/v1/events?page=${PAGE}&per_page=${PAGE_SIZE}&latitude=${latitude}&longitude=${longitude}&distance=${distance}`;

  if (startUnixTime) url += `&start_unix_time=${startUnixTime}`;
  if (endUnixTime) url += `&end_unix_time=${endUnixTime}`;
  if (orderBy) url += `&order_by=${orderBy}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

export const getServerSideProps = async (context) => {
  const { cookie: cookieString } = context.req.headers;
  const cookies = parseCookies(cookieString);

  const { latitude, longitude, distance } = getLocationDataFromCookies(cookies);
  const { startUnixTime, endUnixTime, orderBy } =
    getFilterDataFromCookies(cookies);

  if (!latitude || !longitude || !distance) {
    return {
      props: { initialEvents: [] },
    };
  }

  const initialEvents = await fetchInitialEvents(
    latitude,
    longitude,
    distance,
    startUnixTime,
    endUnixTime,
    orderBy
  );

  if (process.env.NODE_ENV === "development") {
    await i18n?.reloadResources();
  }

  const translations = await serverSideTranslations(context.locale, [
    'common'
  ]);

  return {
    props: {
      initialEvents,
      ...translations
    },
  };
};

const Events: React.FC<{
  initialEvents: EventRes[];
}> = ({ initialEvents }) => {
  const router = useRouter();
  const { userConfig, init, update } = useUserConfig(router);
  const [page, setPage] = useState(initialEvents.length === 0 ? 1 : 2);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialEvents.length === 0 || initialEvents.length == PAGE_SIZE
  );
  const [events, setEvents] = useState(initialEvents);
  const [isSwiped, setIsSwiped] = useState(false);
  const menuRef = useRef(null);
  const itemRefs = {};
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!userConfig) init();
  }, []);

  useEffect(() => {
    loadFirstEvents();
  }, [userConfig]);

  const loadMoreEvents = async () => {
    if (!hasMore) return;

    loadEvents();
  };

  const loadFirstEvents = async () => {
    loadEvents(PAGE, []);
  };

  const loadEvents = async (pageToLoad?: number, prevEvents?: EventRes[]) => {
    if (loading || !userConfig) return;

    pageToLoad ||= page;
    if (!prevEvents || prevEvents.length == 0) prevEvents ||= events;
    setLoading(true);
    setHasMore(true);

    let url = `/api/events?page=${pageToLoad}&per_page=${PAGE_SIZE}&latitude=${userConfig.latitude}&longitude=${userConfig.longitude}&distance=${userConfig.distance}`;

    if (userConfig?.startUnixTime && userConfig?.endUnixTime) {
      url += `&startUnixTime=${userConfig.startUnixTime}&endUnixTime=${userConfig.endUnixTime}`;
    }

    if (userConfig?.orderBy) url += `&orderBy=${userConfig.orderBy}`;

    try {
      const response = await fetch(url);

      const data: EventsRes = await response.json();

      const newEvents = data.items;

      if (newEvents.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (newEvents.length === 0) {
        setLoading(false);
        return;
      }

      setEvents([...prevEvents, ...newEvents]);
      setPage(pageToLoad + 1);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  function getNextWeekend(): {
    startUnixTime: number;
    endUnixTime: number;
  } {
    const today = moment();
    const isFriday = today.day() === 5;
    const fridayOfThisWeek = moment().startOf('week').add(4, 'days');

    // If today is before Friday or is Friday, return this week's Friday to Sunday.
    // Otherwise, return the next week's Friday to Sunday.
    const startOfWeekend =
      today.isBefore(fridayOfThisWeek) || isFriday
        ? fridayOfThisWeek
        : fridayOfThisWeek.add(1, 'week');
    const endOfWeekend = startOfWeekend.clone().endOf('day').add(2, 'days'); // End of Sunday

    return {
      startUnixTime: startOfWeekend.valueOf(), // Converts the moment object to a Unix timestamp in milliseconds
      endUnixTime: endOfWeekend.valueOf(), // Converts the moment object to a Unix timestamp in milliseconds
    };
  }

  function getCurrentMonth() {
    const currentDate = moment();
    const endDate = moment().add(30, 'days');

    return {
      startUnixTime: currentDate.valueOf(), // Converts the moment object to a Unix timestamp in milliseconds
      endUnixTime: endDate.valueOf(), // Converts the moment object to a Unix timestamp in milliseconds
    };
  }

  // Swipe feature

  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const minSwipeDistance = 100;

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => (touchEndRef.current = e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;

    if (isLeftSwipe) {
      setIsSwiped(!isSwiped);
      router.push({
        pathname: '/groups',
        query: router.query,
      });
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  // userConfig Menu

  const { t } = useTranslation('common');

  const items = [
    { id: SELECTED_ITEMS.CHRONOLOGICAL, label: t('nav_item1') },
    {
      id: SELECTED_ITEMS.POPULAR_WEEKEND,
      label: t('nav_item2'),
    },
    {
      id: SELECTED_ITEMS.POPULAR_MONTH,
      label: t('nav_item3'),
    },
    { id: SELECTED_ITEMS.ALL_TIME_POPULAR, label: t('nav_item4') },
  ];

  useEffect(() => {
    if (userConfig?.selectedItem) {
      setSelectedItem(userConfig.selectedItem);
    }
  }, [userConfig]);

  useEffect(() => {
    if (selectedItem && itemRefs[selectedItem] && menuRef.current) {
      const selectedItemRef = itemRefs[selectedItem];
      menuRef.current.scrollLeft =
        selectedItemRef.offsetLeft -
        menuRef.current.offsetWidth / 2 +
        selectedItemRef.offsetWidth / 2;
    }
  }, [selectedItem]);

  const handleItemClick = (id) => {
    setSelectedItem(id);

    // Adjust the scroll position to ensure the selected item is in view
    const selectedItemRef = itemRefs[id];
    if (selectedItemRef && menuRef.current) {
      menuRef.current.scrollLeft =
        selectedItemRef.offsetLeft -
        menuRef.current.offsetWidth / 2 +
        selectedItemRef.offsetWidth / 2;
    }

    if (id === SELECTED_ITEMS.POPULAR_WEEKEND) {
      const { startUnixTime, endUnixTime } = getNextWeekend();
      update({
        longitude: userConfig.longitude,
        latitude: userConfig.latitude,
        city: userConfig.city,
        distance: userConfig.distance,
        startUnixTime,
        endUnixTime,
        orderBy: OrderBy.POPULARITY,
        selectedItem: SELECTED_ITEMS.POPULAR_WEEKEND,
      });
    }

    if (id === SELECTED_ITEMS.POPULAR_MONTH) {
      const { startUnixTime, endUnixTime } = getCurrentMonth();
      update({
        longitude: userConfig.longitude,
        latitude: userConfig.latitude,
        city: userConfig.city,
        distance: userConfig.distance,
        startUnixTime,
        endUnixTime,
        orderBy: OrderBy.POPULARITY,
        selectedItem: SELECTED_ITEMS.POPULAR_MONTH,
      });
    }

    if (id === SELECTED_ITEMS.ALL_TIME_POPULAR) {
      update({
        longitude: userConfig.longitude,
        latitude: userConfig.latitude,
        city: userConfig.city,
        distance: userConfig.distance,
        startUnixTime: null,
        endUnixTime: null,
        orderBy: OrderBy.POPULARITY,
        selectedItem: SELECTED_ITEMS.ALL_TIME_POPULAR,
      });
    }

    if (id === SELECTED_ITEMS.CHRONOLOGICAL) {
      update({
        longitude: userConfig.longitude,
        latitude: userConfig.latitude,
        city: userConfig.city,
        distance: userConfig.distance,
        startUnixTime: null,
        endUnixTime: null,
        orderBy: OrderBy.CHRONOLOGICAL,
        selectedItem: SELECTED_ITEMS.CHRONOLOGICAL,
      });
    }

    scrollToTop();
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <TopNav>
        <div
          ref={menuRef}
          className="sticky top-0 z-30 flex space-x-2 overflow-x-auto bg-zinc-50 px-2 pb-3 pt-2 md:justify-center"
        >
          {items.map((item) => (
            <div
              ref={(el) => (itemRefs[item.id] = el)} // Attach the ref to each item
              key={item.id}
              onClick={() => {
                handleItemClick(item.id);
              }}
              className={`flex max-w-[12rem] flex-none items-center justify-center rounded-lg bg-white px-3 py-1 text-center ${
                selectedItem === item.id
                  ? 'border-2 border-blue-500 font-semibold text-blue-500'
                  : 'border border-gray-300 text-gray-700'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </TopNav>
      <main className="mx-auto min-h-screen max-w-screen-xl pb-28 px-safe">
        <div className={`${isSwiped && 'slideOutToLeftAnimation'}`}>
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className={`${isSwiped && 'slideOutToLeftAnimation'}`}>
              <InfiniteScroll
                dataLength={events.length}
                next={loadMoreEvents}
                hasMore={hasMore}
                className="pb-50 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] items-start justify-center gap-4 pt-2"
                style={{ overflow: 'hidden' }}
                loader={
                  <div className="basis-full">
                    <div className="loader mx-auto mt-8 h-12 w-12 rounded-full border-4 border-t-4 border-gray-200 ease-linear"></div>
                  </div>
                }
              >
                {events.map((event, index) => (
                  <EventCard key={index} event={event} details={false} />
                ))}
              </InfiniteScroll>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
};

export default Events;
