import moment from 'moment'
import React, { useState, useEffect, useRef } from 'react'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import {
	EventRes,
	RecurringPattern,
	EventVoteRes,
} from '../utils/backend_client'
import 'moment/locale/de'
import EditIcon from '@mui/icons-material/Edit'
import { useRouter } from 'next/router'
import { ButtonBase, Chip } from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp'
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown'
import ArrowCircleUpTwoToneIcon from '@mui/icons-material/ArrowCircleUpTwoTone'
import ArrowCircleDownTwoToneIcon from '@mui/icons-material/ArrowCircleDownTwoTone'
import axios, { AxiosResponse } from 'axios'
import LaunchIcon from '@mui/icons-material/Launch'

const EventCard = ({ event }: { event: EventRes }) => {
	const cardRef = useRef(null)
	const { user } = useUser()
	const router = useRouter()
	const [votesDiff, setVotesDiff] = useState(event.votes_diff)
	const [upvoteClicked, setUpvoteClicked] = useState(false)
	const [downvoteClicked, setDownvoteClicked] = useState(false)
	const [clicked, setClicked] = useState(false)

	useEffect(() => {
		if (user?.sub) loadVotes()

		function handleClickOutside(event) {
			if (cardRef.current && !cardRef.current.contains(event.target)) {
				setClicked(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [user])

	async function loadVotes() {
		const upvotes: AxiosResponse<EventVoteRes[]> = await axios.get(
			`/api/events/${event.event_id}/upvotes`
		)
		const downvotes: AxiosResponse<EventVoteRes[]> = await axios.get(
			`/api/events/${event.event_id}/downvotes`
		)

		upvotes.data.map((vote) => {
			if (vote.user_id === user.sub) setUpvoteClicked(true)
		})

		downvotes.data.map((vote) => {
			if (vote.user_id === user.sub) setDownvoteClicked(true)
		})
	}

	function handle_edit() {
		router.push(`/events/${event.event_id}`)
	}

	async function handle_upvotes() {
		if (!user) {
			router.push('/api/auth/login')
			return
		}

		if (upvoteClicked) {
			setUpvoteClicked(false)
			await axios.delete(`/api/events/${event.event_id}/upvotes`)
			setVotesDiff((preValue) => preValue - 1)
		} else if (downvoteClicked) {
			setDownvoteClicked(false)
			await axios.delete(`/api/events/${event.event_id}/downvotes`)
			setVotesDiff((preValue) => preValue + 1)
		} else {
			setUpvoteClicked(true)
			await axios.post(`/api/events/${event.event_id}/upvotes`)
			setVotesDiff((preValue) => preValue + 1)
		}
	}

	async function handle_downvotes() {
		if (!user) {
			router.push('/api/auth/login')
			return
		}

		if (upvoteClicked) {
			setUpvoteClicked(false)
			await axios.delete(`/api/events/${event.event_id}/upvotes`)
			setVotesDiff((preValue) => preValue - 1)
		} else if (downvoteClicked) {
			setDownvoteClicked(false)
			await axios.delete(`/api/events/${event.event_id}/downvotes`)
			setVotesDiff((preValue) => preValue + 1)
		} else {
			setDownvoteClicked(true)
			await axios.post(`/api/events/${event.event_id}/downvotes`)
			setVotesDiff((preValue) => preValue - 1)
		}
	}

	const handle = (href) => {
		if (!href) return
		router.push(href)
	}

	const get_day = (unix_time): string => {
		const eventMoment = moment(unix_time)
		const now = moment()

		if (eventMoment.isSame(now, 'day')) {
			return 'Heute'
		} else if (eventMoment.isSame(now.add(1, 'day'), 'day')) {
			return 'Morgen'
		} else if (eventMoment.isSame(now, 'week')) {
			return `Diesen ${eventMoment.format('dddd')}`
		} else {
			return eventMoment.format('dddd')
		}
	}

	return (
		<div className='mx-3 w-96 rounded-xl border border-gray-200 bg-white shadow'>
			<div
				className=' relative'
				data-te-ripple-init
				data-te-ripple-color='light'
				onClick={() => setClicked(!clicked)}
				ref={cardRef}
			>
				<img
					className={`event-img-16-9 rounded-t-xl bg-black object-cover ${
						event.link || event.created_by === user?.sub ? 'cursor-pointer' : ''
					}`}
					src={event.image_url}
					alt='Salsa Kizz'
				/>
				{clicked && (event.link || event.created_by === user?.sub) && (
					<div className='absolute bottom-0 left-0 right-0 top-0 z-10 h-full w-full overflow-hidden bg-black bg-fixed opacity-40 transition duration-300 ease-in-out'></div>
				)}

				{clicked && event.link && (
					<div className='absolute left-0 top-0 flex h-full w-full cursor-pointer justify-between p-2'>
						<div />
						<LaunchIcon
							color='primary'
							onClick={() => handle(event.link)}
							className='z-30 cursor-pointer text-4xl'
						/>
					</div>
				)}
				{clicked && event.created_by === user?.sub && (
					<div className='absolute left-0 top-0 flex h-full w-full cursor-pointer items-end justify-between p-2'>
						<div />
						<EditIcon
							color='primary'
							onClick={handle_edit}
							className='z-20 cursor-pointer text-4xl'
							data-testid="edit-test-id"
						/>
					</div>
				)}
			</div>

			<div className='flex px-2 py-1'>
				<div className='flex-grow'>
					<div className='flex justify-between'>
						<div className='text-md flex items-baseline justify-between gap-2'>
							<span className='text-xl font-bold text-red-500'>
								{get_day(event.unix_time)}
							</span>
							{moment(event.unix_time).format('DD.MM')}
							<p>{moment(event.unix_time).format('HH:mm ')}Uhr</p>
						</div>
					</div>
					<div className='mb-2 mt-1 flex justify-between'>
						<h4 className='mr-2 text-2xl font-semibold tracking-tight text-gray-900'>
							{event.title}
						</h4>
					</div>
					<div className='mb-2 flex justify-between'>
						<div className='flex'>
							<LocationOnIcon />
							<p className='ml-2'>{event.location}</p>
						</div>

						{event.recurring_pattern === RecurringPattern.WEEKLY && (
							<Chip
								variant='outlined'
								label={RecurringPattern.WEEKLY.toLowerCase()}
								size='small'
							/>
						)}
						<div />
					</div>
				</div>
				<div className='flex items-center'>
					<div className='flex flex-col'>
						{upvoteClicked ? (
							<ArrowCircleUpTwoToneIcon
								onClick={handle_upvotes}
								color='primary'
								className='cursor-pointer'
							/>
						) : (
							<ArrowCircleUpIcon
								onClick={handle_upvotes}
								color='primary'
								className='cursor-pointer'
							/>
						)}
						<p className='text-center'>{votesDiff}</p>
						{downvoteClicked ? (
							<ArrowCircleDownTwoToneIcon
								onClick={handle_downvotes}
								color='primary'
								className='cursor-pointer'
							/>
						) : (
							<ArrowCircleDownIcon
								onClick={handle_downvotes}
								color='primary'
								className='cursor-pointer'
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default EventCard
