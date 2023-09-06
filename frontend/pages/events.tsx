import React, { useState, useEffect, useRef } from 'react'
import Page from '@/components/page'
import EventCard from '@/components/event-card'
import {
	BackendClient,
	EventsRes,
	EventRes,
	EventIds,
} from '../utils/backend_client'
import Fab from '@mui/material/Fab'
import { styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { useRouter } from 'next/router'
import { useUser } from '@auth0/nextjs-auth0/client'
import { ButtonBase } from '@mui/material'
import InfiniteScroll from 'react-infinite-scroll-component'
import axios, { AxiosResponse } from 'axios'

const PAGE_SIZE = 10

export const getServerSideProps = async () => {
	const backendClient = new BackendClient({
		BASE: process.env.BACKEND_URL,
	})

	const { items: initialEvents } = await backendClient.events.getEvents(
		1,
		PAGE_SIZE
	)

	return {
		props: { initialEvents },
	}
}

const Events: React.FC<{ initialEvents: EventRes[] }> = ({ initialEvents }) => {
	const router = useRouter()
	const { user } = useUser()
	const [page, setPage] = useState(2)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(initialEvents.length == PAGE_SIZE)
	const [events, setEvents] = useState(initialEvents)
	const [userUpvotes, setUserUpvotes] = useState<EventIds>([])
	const [userDownvotes, setUserDownvotes] = useState<EventIds>([])
	const [isSwiped, setIsSwiped] = useState(false)
	const [userLocation, setUserLocation] = useState(null)

	const handleUserLocation = function () {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(success, error)
		}
		else {
			console.log("Geolocation not supported")
		}
	}

	const success = function (position) {
		const latitude = position.coords.latitude
		const longitude = position.coords.longitude
		console.log(`Latitude: ${latitude}, Longitude: ${longitude}`)
		setUserLocation({ latitude, longitude })
	}

	const error = function () {
		console.log("Unable to retrieve your location")
	}

	useEffect(() => {
		user && handleUserLocation()	
	}, [user])

	useEffect(() => {
		if (user?.sub) loadUserVotes()
	}, [user])

	const loadUserVotes = async function () {
		const upvotes: AxiosResponse<string[]> = await axios.get(
			`/api/users/${user.sub}/events/upvotes`
		)
		setUserUpvotes(upvotes.data)

		const downvotes: AxiosResponse<string[]> = await axios.get(
			`/api/users/${user.sub}/events/downvotes`
		)
		setUserDownvotes(downvotes.data)
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
			setEvents((prevEvents) => [...prevEvents, ...newEvents])
		} catch (error) {
			console.error('Error loading more events:', error)
		} finally {
			setLoading(false)
		}
	}

	const touchStartRef = useRef(null)
	const touchEndRef = useRef(null)

	const minSwipeDistance = 100

	const onTouchStart = (e) => {
		touchEndRef.current = null
		touchStartRef.current = e.targetTouches[0].clientX
	}

	const onTouchMove = (e) => (touchEndRef.current = e.targetTouches[0].clientX)

	const onTouchEnd = () => {
		if (!touchStartRef.current || !touchEndRef.current) return

		const distance = touchStartRef.current - touchEndRef.current
		const isLeftSwipe = distance > minSwipeDistance

		if (isLeftSwipe) {
			setIsSwiped(!isSwiped)
			router.push('/groups')
		}

		touchStartRef.current = null
		touchEndRef.current = null
	}

	return (
		<div
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			<Page>
				<div className={`${isSwiped && 'slideOutToLeftAnimation'}`}>
					<InfiniteScroll
						dataLength={events.length}
						next={loadMore}
						hasMore={hasMore}
						className='pb-50 grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] items-start justify-center gap-3 pt-4'
						style={{ overflow: 'hidden' }}
						loader={
							<div className='basis-full'>
								<div className='loader mx-auto mt-8 h-12 w-12 rounded-full border-4 border-t-4 border-gray-200 ease-linear'></div>
							</div>
						}
					>
						{events.map((event, index) => (
							<EventCard
								key={index}
								event={event}
								upvoted={userUpvotes.indexOf(event.event_id) !== -1}
								downvoted={userDownvotes.indexOf(event.event_id) !== -1}
							/>
						))}
					</InfiniteScroll>
				</div>
			</Page>
		</div>
	)
}

export default Events
