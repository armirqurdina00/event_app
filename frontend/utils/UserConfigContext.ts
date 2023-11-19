import { createContext } from 'react';

export interface UserConfig {
  latitude: number;
  longitude: number;
  distance: number;
  city: string;
  startUnixTime?: number | null;
  endUnixTime?: number | null;
  orderBy?: string | null;
  selectedItem?: string | null;
}

export interface UserConfigContextType {
  userConfig: UserConfig;

  setUserConfig: (userConfig: UserConfig) => void;
}

const UserConfigContext = createContext<UserConfigContextType | null>(null);

export default UserConfigContext;
