import * as React from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import Container from '@mui/material/Container'
import Avatar from '@mui/material/Avatar'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/router'
import { Menu, MenuItem } from '@mui/material'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useEffect, useContext, useState } from 'react'
import { useUserConfig } from '@/hooks/useUserConfig'

function ResponsiveAppBar({ children }: ResponsiveAppBarProps) {
	const { user } = useUser()
	const router = useRouter()
	const { userConfig } = useUserConfig(router)
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
	const open = Boolean(anchorEl)

	const [sticky, setSticky] = useState(false)
	const [lastScrollY, setLastScrollY] = useState(0)
	const [scrollUpDistance, setScrollUpDistance] = useState(0)
	const [scrollDownDistance, setScrollDownDistance] = useState(0)

	useEffect(() => {
		const controlNavbar = () => {
			if (typeof window !== 'undefined') {
				if (window.scrollY < 5) {
					setSticky(false)
					setScrollDownDistance(0)
					setScrollUpDistance(0)
				}
				else if (window.scrollY > lastScrollY) {
					setScrollUpDistance(0)
					// if scroll down hide the navbar
					if (scrollDownDistance > 300) { //if user scrolls down > 300px
						setSticky(false)
					}
					else {
						const distance = scrollDownDistance + (window.scrollY - lastScrollY)
						setScrollDownDistance(distance)
					}
				} else {
					// if scroll up show the navbar
					if (scrollUpDistance > 500) { // if user scrolls up > 500px
						setSticky(true)
						setScrollDownDistance(0)
					}
					else {
						const distance = scrollUpDistance + (lastScrollY - window.scrollY)
						setScrollUpDistance(distance)
					}
				}

				// remember current page location to use in the next move
				setLastScrollY(window.scrollY)
			}
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', controlNavbar)

			// cleanup function
			return () => {
				window.removeEventListener('scroll', controlNavbar)
			}
		}
	}, [lastScrollY])

	const handle_logout = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/logout')
	}

	const handle_login = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/login')
	}

	const handle_imprint = (event: React.MouseEvent<HTMLElement>) => {
		router.push({
			pathname: '/imprint',
			query: router.query,
		})
	}

	const handle_location = (event: React.MouseEvent<HTMLElement>) => {
		if (router.pathname.includes('/groups')) {
			router.push({
				pathname: '/groups/location',
				query: router.query,
			})
		} else {
			router.push({
				pathname: '/events/location',
				query: router.query,
			})
		}
	}

	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget)
	}

	const handle_close = () => {
		setAnchorEl(null)
	}

	const handle_feedback = () => {
		router.push('https://wa.me/4917641952181')
	}

	return (
		<AppBar
			className={`bg-zinc-100 text-zinc-600 static ${sticky
				&& 'sticky transition-transform duration-1000 ease-in-out -translate-y-0'
				} ${scrollDownDistance > 300 && '-translate-y-full'}`}
		>
			<Container maxWidth='xs'>
				<Toolbar
					disableGutters
					className='flex justify-between'
					variant='dense'
				>
					<div
						className='flex flex-grow items-center text-xl'
						onClick={handle_location}
					>
						<LocationOnIcon />
						{userConfig?.city && (
							<p className='ml-2 mr-2 cursor-pointer'>
								{userConfig.city} &middot; {userConfig.distance}
								{'km'}
							</p>
						)}
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
			{children}
		</AppBar>
	)
}
export default ResponsiveAppBar
