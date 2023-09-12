import * as React from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Container from '@mui/material/Container'
import Avatar from '@mui/material/Avatar'
import { useUser } from '@auth0/nextjs-auth0/client'
import LoginIcon from '@mui/icons-material/Login'
import { useRouter } from 'next/router'
import { Button, Menu, MenuItem } from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useEffect, useContext } from 'react'
import LocationContext from '../utils/location-context'

function ResponsiveAppBar() {
	const { user } = useUser()
	const router = useRouter()
	const { location, setLocation } = useContext(LocationContext)

	useEffect(() => {
		const updateUrl = (latitude, longitude) => {
			// Get current query params from the router
			const currentQuery = { ...router.query }

			// Update the parameters
			currentQuery.latitude = latitude
			currentQuery.longitude = longitude

			// Update the current URL without reloading the page
			router.push(
				{
					pathname: router.pathname,
					query: currentQuery,
				},
				undefined,
				{ shallow: true }
			)
		}

		const getUserLocationFromDevice = () => {
			if (!navigator.geolocation) {
				console.log('Geolocation not supported')
				return
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude, longitude } = position.coords
					localStorage.setItem('latitude', String(latitude))
					localStorage.setItem('longitude', String(longitude))
					updateUrl(latitude, longitude)
					setLocation({ latitude, longitude })
				},
				() => console.error('Unable to retrieve your location')
			)
		}

		if (router.query.latitude && router.query.longitude) {
			return
		}

		const latitude = localStorage.getItem('latitude')
		const longitude = localStorage.getItem('longitude')

		if (latitude && longitude) {
			updateUrl(latitude, longitude)
			setLocation({ latitude, longitude })
			return
		}

		getUserLocationFromDevice()
	}, [])

	const handle_logout = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/logout')
	}

	const handle_login = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/login')
	}

	const handle_imprint = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/imprint')
	}

	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
	const open = Boolean(anchorEl)
	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget)
	}
	const handle_close = () => {
		setAnchorEl(null)
	}

	const handle_feedback = () => {
		router.push('https://api.whatsapp.com/send?phone=+4917641952181')
	}

	return (
		<AppBar className='bg-zinc-100 text-zinc-600' position='static'>
			<Container maxWidth='xs'>
				<Toolbar
					disableGutters
					className='flex justify-between'
					variant='dense'
				>
					<div className='flex flex-grow items-center text-xl'>
						<LocationOnIcon />
						<p className='ml-2 mr-2'>{'Karlsruhe'}</p>
					</div>
					<Box>
						<IconButton
							id='basic-button'
							aria-controls={open ? 'basic-menu' : undefined}
							aria-haspopup='true'
							aria-expanded={open ? 'true' : undefined}
							onClick={handleClick}
						>
							<Avatar src={user?.picture} sx={{ width: 36, height: 36 }} />
						</IconButton>

						<Menu
							id='basic-menu'
							anchorEl={anchorEl}
							open={open}
							onClose={handle_close}
							MenuListProps={{
								'aria-labelledby': 'basic-button',
							}}
						>
							<MenuItem onClick={handle_feedback}>
								<span className='mr-1'>Feedback</span>
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
		</AppBar>
	)
}
export default ResponsiveAppBar
