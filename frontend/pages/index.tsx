import React, { useState, useEffect } from 'react'
import Page from '@/components/page'
import EventCard from '@/components/event-card'
import { BackendClient, EventsRes, EventRes } from '../utils/backend_client'
import Fab from '@mui/material/Fab'
import { styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { useRouter } from 'next/router'
import { useUser } from '@auth0/nextjs-auth0/client'
import { ButtonBase } from '@mui/material'
import InfiniteScroll from 'react-infinite-scroll-component'
import CookieConsent from '@/components/cookie-consent'

const StyledFab = styled(Fab)({
	position: 'fixed',
	zIndex: 40,
	bottom: 36,
	left: 0,
	right: 0,
	margin: '0 auto',
	backgroundColor: 'none',
})

const PAGE_SIZE = 10

export const getServerSideProps = async () => {
	const backendClient = new BackendClient({
		BASE: process.env.BACKEND_URL,
	})

	const { items: events } = await backendClient.events.getEvents(1, PAGE_SIZE)

	return {
		props: { events },
	}
}

const Events: React.FC<{ events: EventRes[] }> = ({ events }) => {
	const router = useRouter()
	const { user } = useUser()
	const [page, setPage] = useState(2)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(events.length == PAGE_SIZE)
	const [loadedEvents, setLoadedEvents] = useState(events)

	const login = () => {
		if (!user) router.push('/api/auth/login')
		router.push('/events')
	}

	const loadMore = async () => {
		if (loading || !hasMore) return

		setLoading(true)

		try {
			const response = await fetch(
				`/api/events?page=${page}&per_page=${PAGE_SIZE}`
			)

			const data: EventsRes = await response.json()

			const newEvents = data.items

			if (newEvents.length < PAGE_SIZE) {
				setHasMore(false)
			}

			if (newEvents.length === 0) {
				setLoading(false)
				return
			}

			setPage((page) => page + 1)
			setLoadedEvents((prevEvents) => [...prevEvents, ...newEvents])
		} catch (error) {
			console.error('Error loading more events:', error)
		} finally {
			setLoading(false)
		}
	}

	return (
		<Page>
			<InfiniteScroll
				dataLength={loadedEvents.length}
				next={loadMore}
				hasMore={hasMore}
				className='pb-50 flex flex-wrap items-center justify-center gap-3 pt-4'
				style={{ overflow: 'hidden' }}
				loader={
					<div className='basis-full'>
						<div className='loader mx-auto mt-8 h-12 w-12 rounded-full border-4 border-t-4 border-gray-200 ease-linear'></div>
					</div>
				}
			>
				{loadedEvents.map((event, index) => (
					<EventCard key={index} event={event} />
				))}
			</InfiniteScroll>
			<ButtonBase onClick={login} component='div'>
				<StyledFab
					color='primary'
					className='bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 '
					aria-label='add'
				>
					<AddIcon />
				</StyledFab>
			</ButtonBase>
			<CookieConsent />
		</Page>
	)
}

export default Events
