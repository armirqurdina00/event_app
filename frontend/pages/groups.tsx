import React, { useState, useEffect, useRef } from 'react';
import Page from '@/components/page';
import GroupCard from '@/components/group-card';
import {
  type GroupRes,
  type GroupsRes,
  BackendClient,
} from '../utils/backend_client';
import { useRouter } from 'next/router';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useUserConfig } from '@/hooks/useUserConfig';
import { COOKIE_KEYS } from '../utils/constants';
import cookie from 'cookie';

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

const fetchInitialGroups = async (latitude, longitude, distance) => {
  const backendClient = new BackendClient({
    BASE: process.env.BACKEND_URL,
  });
  const { items: initialGroups } = await backendClient.groups.getGroups(
    PAGE,
    PAGE_SIZE,
    latitude,
    longitude,
    distance
  );
  return initialGroups;
};

export const getServerSideProps = async (context) => {
  const { cookie: cookieString } = context.req.headers;
  const cookies = parseCookies(cookieString);

  const { latitude, longitude, distance } = getLocationDataFromCookies(cookies);

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!latitude || !longitude || !distance) {
    return {
      props: { initialGroups: [], googleMapsApiKey },
    };
  }

  const initialGroups = await fetchInitialGroups(latitude, longitude, distance);

  return {
    props: {
      initialGroups,
      googleMapsApiKey,
    },
  };
};

const Groups: React.FC<{
  initialGroups: GroupRes[];
  googleMapsApiKey: string;
}> = ({ initialGroups, googleMapsApiKey }) => {
  const router = useRouter();
  const { userConfig, init } = useUserConfig(router);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialGroups.length === 0 || initialGroups.length == PAGE_SIZE
  );
  const [groups, setGroups] = useState<GroupRes[]>(initialGroups);
  const [isSwiped, setIsSwiped] = useState(false);

  useEffect(() => {
    if (!userConfig) init(googleMapsApiKey);
  }, []);

  useEffect(() => {
    loadFirstGroups();
  }, [userConfig]);

  const loadMoreGroups = async () => {
    if (!hasMore) return;

    loadGroups();
  };

  const loadFirstGroups = async () => {
    loadGroups(PAGE, []);
  };

  const loadGroups = async (pageToLoad?: number, prevGroups?: GroupRes[]) => {
    if (loading || !userConfig) return;

    pageToLoad ||= page;
    if (!prevGroups || prevGroups.length == 0) prevGroups ||= groups;
    setLoading(true);
    setHasMore(true);

    try {
      const response = await fetch(
        `/api/groups?page=${pageToLoad}&per_page=${PAGE_SIZE}&latitude=${userConfig.latitude}&longitude=${userConfig.longitude}&distance=${userConfig.distance}`
      );

      const data: GroupsRes = await response.json();

      const newGroups = data.items;

      if (newGroups.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (newGroups.length === 0) {
        setLoading(false);
        return;
      }

      setGroups([...prevGroups, ...newGroups]);
      setPage(pageToLoad + 1);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      setIsSwiped(!isSwiped);
      router.push({
        pathname: '/events',
        query: router.query,
      });
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Page>
        <div className={`${isSwiped && 'slideOutToRightAnimation'}`}>
          <InfiniteScroll
            dataLength={groups.length}
            next={loadMoreGroups}
            hasMore={hasMore}
            className="pb-50 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] items-start justify-center gap-4 pt-4"
            style={{ overflow: 'hidden' }}
            loader={
              <div className="basis-full">
                <div className="loader mx-auto mt-8 h-12 w-12 rounded-full border-4 border-t-4 border-gray-200 ease-linear"></div>
              </div>
            }
          >
            {groups.map((group, index) => (
              <GroupCard key={index} group={group} />
            ))}
          </InfiniteScroll>
        </div>
      </Page>
    </div>
  );
};

export default Groups;
