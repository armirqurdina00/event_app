import React, { useState, useRef, useEffect } from 'react'
import { GroupRes } from '../utils/backend_client'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import TelegramIcon from '@mui/icons-material/Telegram'
import GroupsIcon from '@mui/icons-material/Groups'
import { useRouter } from 'next/router'
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp'
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown'
import ArrowCircleUpTwoToneIcon from '@mui/icons-material/ArrowCircleUpTwoTone'
import ArrowCircleDownTwoToneIcon from '@mui/icons-material/ArrowCircleDownTwoTone'
import axios from 'axios'
import EditIcon from '@mui/icons-material/Edit'
import { useUser } from '@auth0/nextjs-auth0/client'
import LocationOnIcon from '@mui/icons-material/LocationOn'

const GroupCard = ({
	group,
	upvoted,
	downvoted,
}: {
	group: GroupRes
	upvoted: boolean
	downvoted: boolean
}) => {
	const router = useRouter()
	const { user } = useUser()
	const [votesDiff, setVotesDiff] = useState(group.votes_diff)
	const [upvoteClicked, setUpvoteClicked] = useState(upvoted)
	const [downvoteClicked, setDownvoteClicked] = useState(downvoted)
	const [processing, setProcessing] = useState(false)

	useEffect(() => {
		setUpvoteClicked(upvoted)
	}, [upvoted])
	useEffect(() => {
		setUpvoteClicked(downvoted)
	}, [downvoted])

	// Handle Events

	function handle_link_click() {
		router.push(group.link)
	}

	function handle_edit() {
		router.push(`/groups/${group.group_id}`)
	}

	const handle_location_link = () => {
		if (!group.locationUrl) return
		router.push(group.locationUrl)
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
					`/api/users/${user.sub}/groups/${group.group_id}/upvotes`
				)
				setVotesDiff((preValue) => preValue - 1)
			} else if (downvoteClicked) {
				setDownvoteClicked(false)
				await axios.delete(
					`/api/users/${user.sub}/groups/${group.group_id}/downvotes`
				)
				setVotesDiff((preValue) => preValue + 1)
			} else {
				setUpvoteClicked(true)
				await axios.post(
					`/api/users/${user.sub}/groups/${group.group_id}/upvotes`
				)
				setVotesDiff((preValue) => preValue + 1)
			}
		} catch (err) {
			throw err
		} finally {
			setProcessing(false)
		}
	}

	async function handle_downvotes() {
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
					`/api/users/${user.sub}/groups/${group.group_id}/upvotes`
				)
				setVotesDiff((preValue) => preValue - 1)
			} else if (downvoteClicked) {
				setDownvoteClicked(false)
				await axios.delete(
					`/api/users/${user.sub}/groups/${group.group_id}/downvotes`
				)
				setVotesDiff((preValue) => preValue + 1)
			} else {
				setDownvoteClicked(true)
				await axios.post(
					`/api/users/${user.sub}/groups/${group.group_id}/downvotes`
				)
				setVotesDiff((preValue) => preValue - 1)
			}
		} catch (err) {
			throw err
		} finally {
			setProcessing(false)
		}
	}

	// Render

	function getGroupIcon(link: string) {
		if (link.includes('https://t.me')) {
			return <TelegramIcon style={{ color: '#0088cc', fontSize: '40px' }} />
		} else if (link.includes('whatsapp')) {
			return <WhatsAppIcon style={{ color: '#25d366', fontSize: '40px' }} />
		} else {
			return <GroupsIcon style={{ color: '#0088cc', fontSize: '40px' }} />
		}
	}

	return (
		<div className='mx-3 rounded-xl border border-gray-200 bg-white shadow h-full'>
			<div
				className='relative'
				data-te-ripple-init
				data-te-ripple-color='light'
			>
				<div className='absolute left-0 top-0 flex w-full cursor-pointer justify-between p-2'>
					<div />
					<div className='flex gap-3'>
						{group.created_by === user?.sub && (
							<button
								className='rounded-full bg-black bg-opacity-40 p-1  '
								onClick={handle_edit}
								data-testid='edit-test-id'
							>
								<EditIcon color='primary' className='z-20 text-3xl' />
							</button>
						)}
					</div>
				</div>
				<div className='px-4 py-2'>
					{group.created_by === user?.sub && (
						<div
							className='flex cursor-pointer items-center gap-4'
							onClick={handle_link_click}
						>
							{getGroupIcon(group.link)}
							<h5 className='text-2xl font-semibold tracking-tight text-gray-900'>
								{group.title}
							</h5>
						</div>
					)}
					<div className='flex justify-between gap-4'>
						<div className='flex-grow'>
							{group.created_by != user?.sub && (
								<div
									className='flex cursor-pointer items-center gap-4'
									onClick={handle_link_click}
								>
									{getGroupIcon(group.link)}
									<h5 className='text-2xl font-semibold tracking-tight text-gray-900'>
										{group.title}
									</h5>
								</div>
							)}
							<div
								className='mb-2 mt-2 flex cursor-pointer items-center justify-between'
								onClick={handle_link_click}
							>
								<p className='font-normal text-gray-500'>{group.description}</p>
							</div>
							<div
								className='flex cursor-pointer items-center gap-1 font-medium text-gray-500'
								onClick={handle_location_link}
							>
								<LocationOnIcon className='text-sm' />
								<p>{group.location}</p>
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
			</div>
		</div>
	)
}

export default GroupCard
