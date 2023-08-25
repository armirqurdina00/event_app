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
import LogoutIcon from '@mui/icons-material/Logout'

function ResponsiveAppBar() {
	const { user } = useUser()
	const router = useRouter()

	const handle_logout = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/logout')
	}

	const handle_login = (event: React.MouseEvent<HTMLElement>) => {
		router.push('/api/auth/login')
	}

	return (
		<AppBar className='bg-zinc-100 text-zinc-600' position='static'>
			<Container maxWidth='xs'>
				<Toolbar disableGutters className='flex justify-between'>
					{user && (
						<Box sx={{ flexGrow: 0 }}>
							<IconButton>
								<Avatar src={user.picture} />
							</IconButton>
						</Box>
					)}

					{!user && (
						<Box sx={{ flexGrow: 0 }}>
							<IconButton onClick={handle_login}>
								<LoginIcon /> <p className='ml-2'>Login</p>
							</IconButton>
						</Box>
					)}

					{user && (
						<Box sx={{ flexGrow: 0 }}>
							<IconButton onClick={handle_logout}>
                            <p className='mr-2 text-md'>Logout</p><LogoutIcon />
							</IconButton>
						</Box>
					)}
				</Toolbar>
			</Container>
		</AppBar>
	)
}
export default ResponsiveAppBar
