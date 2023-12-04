import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import Meta from '@/components/meta';
import '@/styles/globals.css';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import { StyledEngineProvider } from '@mui/material/styles';
import Script from 'next/script';
import CookieConsent from '@/components/cookie-consent';
import { useState } from 'react';
import UserConfigContext from '../utils/UserConfigContext';
import { appWithTranslation } from 'next-i18next';

const App = ({ Component, pageProps }: AppProps) => {
  const [userConfig, setUserConfig] = useState(null);

  return (
    <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-GWC7X1TW2N" />
      <Script id="google-analytics">
        {`
				  window.dataLayer = window.dataLayer || [];
				  function gtag(){dataLayer.push(arguments);}
				  gtag('js', new Date());
				  gtag('config', 'G-GWC7X1TW2N');
				`}
      </Script>
      <UserProvider>
        <StyledEngineProvider injectFirst>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
          >
            {' '}
            <UserConfigContext.Provider
              value={{
                userConfig,
                setUserConfig,
              }}
            >
              <Meta />
              <Component {...pageProps} />
            </UserConfigContext.Provider>
          </ThemeProvider>
        </StyledEngineProvider>
      </UserProvider>
      <CookieConsent />
    </>
  );
};

export default appWithTranslation(App);