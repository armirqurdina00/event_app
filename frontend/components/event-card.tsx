import moment from 'moment'
import React, { useState, useEffect, useRef } from 'react'
import { EventRes } from '../utils/backend_client'
import 'moment/locale/de'
import EditIcon from '@mui/icons-material/Edit'
import { useRouter } from 'next/router'
import { Button, Typography } from '@mui/material'
import { useUser } from '@auth0/nextjs-auth0/client'
import axios from 'axios'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import Image from 'next/image'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Link from 'next/link'
import LocationOnIcon from '@mui/icons-material/LocationOn'

const EventCard = ({
	event,
	upvoted,
	downvoted,
}: {
	event: EventRes
	upvoted: boolean
	downvoted: boolean
}) => {
	const { user } = useUser()
	const router = useRouter()
	const [votesDiff, setVotesDiff] = useState(event.votes_diff)
	const [upvoteClicked, setUpvoteClicked] = useState(upvoted)
	const [processing, setProcessing] = useState(false)
	const [showDescription, setShowDescription] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)

	useEffect(() => {
		setUpvoteClicked(upvoted)
	}, [upvoted])
	useEffect(() => {
		setUpvoteClicked(downvoted)
	}, [downvoted])

	// Handle Events

	function handle_edit() {
		router.push(`/events/${event.event_id}`)
	}

	const handle_location_link = () => {
		if (!event.locationUrl) return
		router.push(event.locationUrl)
	}

	async function handle_upvotes() {
		if (processing) return
		setProcessing(true)

		if (!user) {
			router.push('/api/auth/login')
			return
		}

		try {
			if (upvoteClicked) {
				setUpvoteClicked(false)
				await axios.delete(
					`/api/users/${user.sub}/events/${event.event_id}/upvotes`
				)
				setVotesDiff((preValue) => preValue - 1)
			} else {
				setUpvoteClicked(true)
				await axios.post(
					`/api/users/${user.sub}/events/${event.event_id}/upvotes`
				)
				setVotesDiff((preValue) => preValue + 1)
			}
		} catch (err) {
			throw err
		} finally {
			setProcessing(false)
		}
	}

	const handle_fullscreen = () => {
		setIsFullscreen(!isFullscreen)
	}

	// Render

	const get_day = (unix_time) => {
		const eventMoment = moment(unix_time)
		const now = moment()
		const currentWeekNumber = moment().week()
		const eventWeekNumber = eventMoment.week()

		if (eventMoment.isSame(now, 'day')) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						<span className='text-red-500'>Heute</span> &middot;{' '}
						{`${eventMoment.format('dddd')}, ${eventMoment.format('DD.MM')}`}
					</span>
					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else if (eventMoment.isSame(now.add(1, 'day'), 'day')) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						<span className='text-red-500'>Morgen</span> &middot;{' '}
						{`${eventMoment.format('dddd')}, ${eventMoment.format('DD.MM')}`}
					</span>

					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else if (eventWeekNumber === currentWeekNumber) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						Diesen{' '}
						{`${eventMoment.format('dddd')}, ${eventMoment.format('DD.MM')}`}
					</span>
					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else if (eventWeekNumber === currentWeekNumber + 1) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						Nächste Woche &middot;{' '}
						{`${eventMoment.format('dd')}, ${eventMoment.format('DD.MM')}`}
					</span>
					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else if (eventWeekNumber === currentWeekNumber + 2) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						In zwei Wochen &middot;{' '}
						{`${eventMoment.format('dd')}, ${eventMoment.format('DD.MM')}`}
					</span>
					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else if (eventWeekNumber === currentWeekNumber + 3) {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						In drei Wochen &middot;{' '}
						{`${eventMoment.format('dd')}, ${eventMoment.format('DD.MM')}`}
					</span>
					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		} else {
			return (
				<div className='text-md flex items-baseline justify-between gap-2'>
					<span className='text-md font-medium '>
						<span>
							{`${eventMoment.format('dd')}`},{' '}
							{moment(event.unix_time).format('DD.MM')}
						</span>
					</span>

					<p className='text-sm'>
						{moment(event.unix_time).format('HH:mm ')}Uhr
					</p>
				</div>
			)
		}
	}

	const formatTextForDisplay = (inputText) => {
		if (!inputText) return

		const urlPattern = /https?:\/\/[^\s]+/g

		const convertStrToLinks = (str) => {
			let lastIndex = 0
			const result = []

			str.replace(urlPattern, (match, offset) => {
				// Add plain text before the match
				if (offset > lastIndex) {
					result.push(str.substring(lastIndex, offset))
				}

				// Add the link
				result.push(
					<Link className='break-words text-blue-500' href={match} key={match}>
						{match}
					</Link>
				)

				// Update the last index past this match
				lastIndex = offset + match.length
			})

			// Add any remaining plain text
			if (lastIndex < str.length) {
				result.push(str.substring(lastIndex))
			}

			return result
		}

		return inputText.split('\n').map((str, index, array) => (
			<React.Fragment key={index}>
				{convertStrToLinks(str)}
				{index === array.length - 1 ? null : <br />}
			</React.Fragment>
		))
	}

	return (
		<div className='relative mx-2 rounded-xl border border-gray-200 bg-white shadow'>
			<div className='relative w-full'>
				<Image
					className={`event-img-16-9 rounded-t-xl object-cover`}
					src={event.image_url}
					alt='Event Picture'
					layout='responsive'
					width={16}
					height={9}
					objectFit='cover'
					quality={100}
					data-testid='event-picture'
					unoptimized={true}
					onClick={handle_fullscreen}
				/>
				{isFullscreen && (
					<div
						className='fixed left-0 top-0 z-50 flex h-screen w-screen items-center justify-center overflow-y-auto bg-black bg-opacity-70'
						onClick={handle_fullscreen}
					>
						<img src={event.image_url} alt='Description' />
					</div>
				)}
				<div className='absolute left-0 top-0 flex w-full cursor-pointer justify-between p-2'>
					<div />
					<div className='flex gap-3'>
						{event.created_by === user?.sub && (
							<button
								className='rounded-full bg-black bg-opacity-40 p-1'
								onClick={handle_edit}
								data-testid='edit-test-id'
							>
								<EditIcon color='primary' className='z-20 text-3xl' />
							</button>
						)}
					</div>
				</div>
			</div>
			<div className='px-3 py-2'>
				<div className='-my-0.5 flex items-center justify-between'>
					{get_day(event.unix_time)}
					<div />
				</div>
				<div className='-my-0.5 flex  justify-between'>
					<h4 className='text-xl font-semibold tracking-tight'>
						{event.title}
					</h4>
				</div>
				<div className='text-md -my-0.5 flex justify-between font-medium text-gray-500'>
					<div
						className='flex cursor-pointer items-center gap-1'
						onClick={handle_location_link}
					>
						<LocationOnIcon className='text-sm ' />
						<p>{event.location}</p>
					</div>
					<div />
				</div>
				<div className='w-full text-gray-500'>
					<span className='text-sm'>{votesDiff} sind interessiert</span>
					<div className='flex gap-3'>
						<div className='flex-grow'>
							{upvoteClicked ? (
								<Button
									className='mt-1 w-full !bg-blue-100 text-blue-600'
									onClick={handle_upvotes}
								>
									<div className='flex items-center gap-2'>
										<StarIcon color='primary' />{' '}
										<span className='font-bold'> Interessiert</span>
									</div>
								</Button>
							) : (
								<Button
									className='mt-1 w-full !bg-gray-300 text-black'
									onClick={handle_upvotes}
								>
									<div className='flex items-center gap-2'>
										<StarBorderIcon /> <span> Interessiert</span>
									</div>
								</Button>
							)}
						</div>
						{event.description && (
							<div>
								{showDescription ? (
									<Button
										className='mt-1 w-full !bg-blue-100 text-blue-600'
										onClick={() => setShowDescription(!showDescription)}
									>
										<div className='flex items-center gap-2'>
											<ExpandMoreIcon color='primary' />
										</div>
									</Button>
								) : (
									<Button
										className='mt-1 w-full !bg-gray-300 text-black'
										onClick={() => setShowDescription(!showDescription)}
									>
										<div className='flex items-center gap-2'>
											<ExpandMoreIcon />
										</div>
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
			{showDescription && event.description && (
				<div>
					<Typography variant='body1' className='mx-3 mb-3 mt-3 select-text'>
						{formatTextForDisplay(event.description)}
					</Typography>
				</div>
			)}
		</div>
	)
}

export default EventCard
