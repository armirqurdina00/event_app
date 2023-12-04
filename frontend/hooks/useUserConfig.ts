import { useContext } from 'react';
import { getCookie, setCookie } from 'cookies-next';
import UserConfigContext, { type UserConfig } from '../utils/UserConfigContext';
import {
  COOKIE_KEYS,
  MILLISECONDS_IN_10_YEARS,
  DEFAULT_USER_CONFIG,
  SELECTED_ITEMS,
} from '../utils/constants';
import { CityRes, OrderBy } from '@/utils/backend_client';
import axios, { AxiosResponse } from 'axios';

interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
}

export const useUserConfig = (router) => {
  const { userConfig, setUserConfig } = useContext(UserConfigContext);

  const init = async () => {
    console.log('Try to extract user config from URL');
    const {
      latitude: urlLatitude,
      longitude: urlLongitude,
      distance: urlDistance,
      city: urlCity,
    } = router.query;

    if (urlLatitude && urlLongitude && urlDistance && urlCity) {
      console.log('Retrieved user config from url');
      update({
        ...router.query,
        orderBy: router.query.orderBy ?? OrderBy.CHRONOLOGICAL,
        selectedItem: router.query.selectedItem ?? SELECTED_ITEMS.CHRONOLOGICAL,
      });
      return;
    }

    console.log('Try to extract user config from cookies');
    const cookieLatitude = getCookie(COOKIE_KEYS.LATITUDE);
    const cookieLongitude = getCookie(COOKIE_KEYS.LONGITUDE);
    const cookieDistance = getCookie(COOKIE_KEYS.DISTANCE);
    const cookieCity = getCookie(COOKIE_KEYS.CITY);
    const cookieStartUnixTime = getCookie(COOKIE_KEYS.START_UNIX_TIME);
    const cookieEndUnixTime = getCookie(COOKIE_KEYS.END_UNIX_TIME);
    const cookieOrderBy = getCookie(COOKIE_KEYS.ORDER_BY);
    const cookieSelectedItem = getCookie(COOKIE_KEYS.SELECTED_ITEM);

    if (cookieLatitude && cookieLongitude && cookieDistance && cookieCity) {
      update({
        latitude: Number(cookieLatitude),
        longitude: Number(cookieLongitude),
        distance: Number(cookieDistance),
        city: String(cookieCity),
        startUnixTime: cookieStartUnixTime
          ? Number(cookieStartUnixTime)
          : undefined,
        endUnixTime: cookieEndUnixTime ? Number(cookieEndUnixTime) : undefined,
        orderBy: cookieOrderBy ? String(cookieOrderBy) : OrderBy.CHRONOLOGICAL,
        selectedItem: cookieSelectedItem
          ? String(cookieSelectedItem)
          : SELECTED_ITEMS.CHRONOLOGICAL,
      });
      return;
    }

    console.log('Try to extract user config from device');
    const deviceLocation = await getLocationFromDevice();

    if (
      deviceLocation?.latitude &&
      deviceLocation?.longitude &&
      deviceLocation?.city
    ) {
      console.log('Retrieved user config from device');
      update({
        latitude: deviceLocation.latitude,
        longitude: deviceLocation.longitude,
        city: deviceLocation.city,
        distance: DEFAULT_USER_CONFIG.distance,
        orderBy: OrderBy.CHRONOLOGICAL,
        selectedItem: SELECTED_ITEMS.CHRONOLOGICAL,
      });
      return;
    }

    console.log('Use default user config');
    update(DEFAULT_USER_CONFIG);
  };

  const update = (userConfigUpdate: UserConfig) => {
    updateCookies(userConfigUpdate);
    updateURL(userConfigUpdate);
    updateUserConfigState(userConfigUpdate);
  };

  const updateUserConfigState = (userConfigUpdate: UserConfig) => {
    if (userConfig) {
      if (userConfigUpdate.startUnixTime === undefined) {
        userConfigUpdate.startUnixTime = userConfig.startUnixTime;
      }
      if (userConfigUpdate.endUnixTime === undefined) {
        userConfigUpdate.endUnixTime = userConfig.endUnixTime;
      }
      if (userConfigUpdate.orderBy === undefined) {
        userConfigUpdate.orderBy = userConfig.orderBy;
      }
      if (userConfigUpdate.selectedItem === undefined) {
        userConfigUpdate.selectedItem = userConfig.selectedItem;
      }
    }

    if (userConfigUpdate.startUnixTime === null) {
      delete userConfigUpdate.startUnixTime;
    }
    if (userConfigUpdate.endUnixTime === null) {
      delete userConfigUpdate.endUnixTime;
    }
    if (userConfigUpdate.orderBy === null) delete userConfigUpdate.orderBy;
    if (userConfigUpdate.selectedItem === null) {
      delete userConfigUpdate.selectedItem;
    }

    setUserConfig(userConfigUpdate);
  };

  const updateCookies = (userConfig: UserConfig) => {
    const expiryDate = new Date(
      new Date().getTime() + MILLISECONDS_IN_10_YEARS
    );
    const removeCookie = (name) => {
      document.cookie =
        name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    };

    setCookie(COOKIE_KEYS.LATITUDE, String(userConfig.latitude), {
      expires: expiryDate,
    });
    setCookie(COOKIE_KEYS.LONGITUDE, String(userConfig.longitude), {
      expires: expiryDate,
    });
    setCookie(COOKIE_KEYS.DISTANCE, String(userConfig.distance), {
      expires: expiryDate,
    });
    setCookie(COOKIE_KEYS.CITY, userConfig.city, { expires: expiryDate });

    if (userConfig.startUnixTime) {
      setCookie(COOKIE_KEYS.START_UNIX_TIME, String(userConfig.startUnixTime), {
        expires: expiryDate,
      });
    }
    if (userConfig.endUnixTime) {
      setCookie(COOKIE_KEYS.END_UNIX_TIME, String(userConfig.endUnixTime), {
        expires: expiryDate,
      });
    }
    if (userConfig.orderBy) {
      setCookie(COOKIE_KEYS.ORDER_BY, userConfig.orderBy, {
        expires: expiryDate,
      });
    }
    if (userConfig.selectedItem) {
      setCookie(COOKIE_KEYS.SELECTED_ITEM, userConfig.selectedItem, {
        expires: expiryDate,
      });
    }

    if (userConfig.startUnixTime === null) {
      removeCookie(COOKIE_KEYS.START_UNIX_TIME);
    }
    if (userConfig.endUnixTime === null) {
      removeCookie(COOKIE_KEYS.END_UNIX_TIME);
    }
    if (userConfig.endUnixTime === null) {
      removeCookie(COOKIE_KEYS.ORDER_BY);
    }
    if (userConfig.selectedItem === null) {
      removeCookie(COOKIE_KEYS.SELECTED_ITEM);
    }
  };

  const updateURL = (userConfig: UserConfig) => {
    console.log('updateURL userConfig', userConfig);

    router.query.latitude = userConfig.latitude;
    router.query.longitude = userConfig.longitude;
    router.query.distance = userConfig.distance;
    router.query.city = userConfig.city;

    if (userConfig.startUnixTime) {
      router.query.startUnixTime = userConfig.startUnixTime;
    }
    if (userConfig.endUnixTime) {
      router.query.endUnixTime = userConfig.endUnixTime;
    }
    if (userConfig.orderBy) router.query.orderBy = userConfig.orderBy;
    if (userConfig.selectedItem) {
      router.query.selectedItem = userConfig.selectedItem;
    }

    if (userConfig.startUnixTime === null) delete router.query.startUnixTime;
    if (userConfig.endUnixTime === null) delete router.query.endUnixTime;
    if (userConfig.orderBy === null) delete router.query.orderBy;
    if (userConfig.selectedItem === null) delete router.query.selectedItem;

    router.push({ pathname: router.pathname, query: router.query }, undefined, {
      shallow: true,
    });
  };

  const getLocationFromDevice = async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported.');
      return null;
    }

    try {
      console.log('Fetching current position...');
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve(position);
            },
            () => {
              reject('Unable to retrieve your location');
            }
          );
        }
      );

      const { latitude, longitude } = position.coords;
      console.log(
        `Current position: Latitude: ${latitude}, Longitude: ${longitude}`
      );

      const city = await getCityByCoordinates(longitude, latitude);
      console.log(`City found: ${city}`);

      return {
        latitude,
        longitude,
        city,
      };
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  };

  const getCityByCoordinates = async (
    longitude: number,
    latitude: number
  ): Promise<string> => {
    const res: AxiosResponse<CityRes> = await axios.get(
      `/api/locations/city?lat=${latitude}&lng=${longitude}`
    );

    return res.data.name;
  };

  return {
    userConfig,
    update,
    init,
  };
};
