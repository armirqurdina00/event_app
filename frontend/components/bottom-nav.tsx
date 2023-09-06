import { useRouter } from 'next/router'
import Button from '@mui/material/Button'
import { useUser } from '@auth0/nextjs-auth0/client'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import GroupsIcon from '@mui/icons-material/Groups'
import EventIcon from '@mui/icons-material/Event'

const BottomNav = () => {
	const router = useRouter()
	const { user } = useUser()

	function handle(href) {
		router.push(href)
	}

	const add = () => {
		if (!user) router.push('/api/auth/login')
		if (/^\/groups*/.test(router.pathname)) {
			router.push('/groups/new')
		} else if (/^\/events*/.test(router.pathname)) {
			router.push('/events/new')
		}
	}

	return (
		<div className=''>
			<nav className='fixed bottom-0 z-30 w-full border-t bg-zinc-100 pb-safe'>
				<div className='mx-auto flex h-14 max-w-md items-center justify-between px-6'>
					<Button
						className='flex h-full w-[40%] flex-col items-center justify-center'
						key='Events'
						onClick={() => handle('/events')}
					>
						<EventIcon
							className={`text-4xl ${
								router.pathname == '/events' ? 'text-blue-600' : 'text-zinc-600'
							}`}
						/>
						<span
							className={`mt text-xs ${
								router.pathname == '/events' ? 'text-blue-600' : 'text-zinc-600'
							}`}
						>
							{'Events'}
						</span>
					</Button>

					<Button
						onClick={add}
						className='flex h-full w-[40%] flex-col items-center justify-center'
						key='Add'
						data-testid='add-group-or-event'
					>
						<AddCircleOutlineIcon
							className={`text-5xl ${
								router.pathname == '/groups/new' ||
								router.pathname === '/events/new'
									? 'text-blue-600'
									: 'text-zinc-600'
							}`}
						/>
					</Button>

					<Button
						className='flex h-full w-[40%] flex-col items-center justify-center'
						key='Gruppen'
						onClick={() => handle('/groups')}
					>
						<GroupsIcon
							className={`text-4xl ${
								router.pathname == '/groups' ? 'text-blue-600' : 'text-zinc-600'
							}`}
						/>
						<span
							className={`mt text-xs ${
								router.pathname == '/groups' ? 'text-blue-600' : 'text-zinc-600'
							}`}
						>
							{'Gruppen'}
						</span>
					</Button>
				</div>
			</nav>
		</div>
	)
}

export default BottomNav
