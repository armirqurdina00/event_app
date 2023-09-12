import type { AppProps } from 'next/app'
import { ThemeProvider } from 'next-themes'
import Meta from '@/components/meta'
import '@/styles/globals.css'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import { StyledEngineProvider } from '@mui/material/styles'
import Script from 'next/script'
import CookieConsent from '@/components/cookie-consent'
import { useState } from 'react'
import LocationContext from '../utils/location-context'

const App = ({ Component, pageProps }: AppProps) => {
	const [location, setLocation] = useState({
		latitude: 49.006889,
		longitude: 8.403653,
	})

	return (
		<>
			<Script src='https://www.googletagmanager.com/gtag/js?id=G-GWC7X1TW2N' />
			<Script id='google-analytics'>
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
						attribute='class'
						defaultTheme='system'
						disableTransitionOnChange
					>
						{' '}
						<LocationContext.Provider
							value={{
								location,
								setLocation,
							}}
						>
							<Meta />
							<Component {...pageProps} />
						</LocationContext.Provider>
					</ThemeProvider>
				</StyledEngineProvider>
			</UserProvider>
			<CookieConsent />
		</>
	)
}

export default App
