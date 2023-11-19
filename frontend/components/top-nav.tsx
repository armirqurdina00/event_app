/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { Menu, MenuItem } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useEffect, useState, useRef } from 'react';
import { useUserConfig } from '@/hooks/useUserConfig';

const LONG_SCROLL_UP = 300;
const LONG_SCROLL_DOWN = 100;

const useScrollControl = () => {
  const [scrollUpDistance, setScrollUpDistance] = useState(0);
  const [scrollDownDistance, setScrollDownDistance] = useState(0);
  const [sticky, setSticky] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 5) {
        setSticky(false);
        setScrollDownDistance(0);
        setScrollUpDistance(0);
      } else if (currentScrollY > lastScrollY.current) {
        // scroll down
        setScrollUpDistance(0);

        if (scrollDownDistance > LONG_SCROLL_DOWN) {
          // scroll down long enough
          setSticky(false);
        } else {
          setScrollDownDistance(
            (prevDistance) =>
              prevDistance + (currentScrollY - lastScrollY.current)
          );
        }
      } else {
        // scroll up
        if (scrollUpDistance > LONG_SCROLL_UP) {
          // scroll up long enough
          setScrollDownDistance(0);
          setSticky(true);
        } else {
          setScrollUpDistance(
            (prevDistance) =>
              prevDistance + (lastScrollY.current - currentScrollY)
          );
        }
      }
      lastScrollY.current = currentScrollY;
    };

    // Throttle the scroll handler to improve performance
    const throttledHandleScroll = throttle(handleScroll, 100);

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', throttledHandleScroll);

      return () => {
        window.removeEventListener('scroll', throttledHandleScroll);
      };
    }
  }, [scrollDownDistance, scrollUpDistance]);

  return { scrollUpDistance, scrollDownDistance, sticky };
};

function ResponsiveAppBar({ children }: { children?: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();
  const { userConfig } = useUserConfig(router);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { scrollDownDistance, sticky } = useScrollControl();

  const handle_logout = () => {
    router.push('/api/auth/logout');
  };

  const handle_login = () => {
    router.push('/api/auth/login');
  };

  const handle_imprint = () => {
    router.push({
      pathname: '/imprint',
      query: router.query,
    });
  };

  const handle_location = () => {
    if (router.pathname.includes('/groups')) {
      router.push({
        pathname: '/groups/location',
        query: router.query,
      });
    } else {
      router.push({
        pathname: '/events/location',
        query: router.query,
      });
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handle_close = () => {
    setAnchorEl(null);
  };

  const handle_feedback = () => {
    router.push('https://wa.me/4917641952181');
  };

  return (
    <AppBar
      className={`static bg-zinc-100 text-zinc-600 ${
        sticky &&
        'sticky -translate-y-0 transition-transform duration-1000 ease-in-out'
      } ${scrollDownDistance > LONG_SCROLL_DOWN && '-translate-y-full'}`}
    >
      <Container maxWidth="xs">
        <Toolbar
          disableGutters
          className="flex justify-between"
          variant="dense"
        >
          <div
            className="flex flex-grow items-center text-xl"
            onClick={handle_location}
          >
            <LocationOnIcon />
            {userConfig?.city && (
              <p className="ml-2 mr-2 cursor-pointer">
                {userConfig.city} &middot; {userConfig.distance}
                {'km'}
              </p>
            )}
          </div>
          <Box>
            <IconButton
              id="basic-button"
              aria-controls={open ? 'basic-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
            >
              <Avatar src={user?.picture} sx={{ width: 36, height: 36 }} />
            </IconButton>

            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handle_close}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              <MenuItem onClick={handle_feedback}>
                <span className="mr-1">Feedback</span>
                <WhatsAppIcon style={{ color: '#25d366', fontSize: '20px' }} />
              </MenuItem>
              <MenuItem onClick={handle_imprint}>Impressum</MenuItem>
              {!user ? (
                <MenuItem onClick={handle_login}>Login</MenuItem>
              ) : (
                <MenuItem onClick={handle_logout}>Logout</MenuItem>
              )}
            </Menu>
          </Box>
        </Toolbar>
      </Container>
      {children}
    </AppBar>
  );
}
export default ResponsiveAppBar;

function throttle(func, wait) {
  let context, args, timeout, result;
  let previous = 0;

  const later = () => {
    previous = Date.now();
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) {
      context = args = null;
    }
  };

  const throttled = function () {
    const now = Date.now();
    const remaining = wait - (now - previous);
    context = this;
    args = arguments;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      if (!timeout) {
        context = args = null;
      }
    } else if (!timeout) {
      timeout = setTimeout(later, remaining);
    }

    return result;
  };

  throttled.cancel = function () {
    clearTimeout(timeout);
    previous = 0;
    timeout = null;
    context = args = null;
  };

  return throttled;
}
