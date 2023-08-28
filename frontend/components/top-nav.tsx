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

function ResponsiveAppBar() {
	const { user } = useUser()
	const router = useRouter()

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
				<Toolbar disableGutters className='flex justify-between'>
					<div className='flex flex-grow items-center text-2xl'>
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
							<Avatar src={user?.picture} />
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
