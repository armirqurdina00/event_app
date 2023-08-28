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
import LaunchIcon from '@mui/icons-material/Launch'
import EditIcon from '@mui/icons-material/Edit'
import { useUser } from '@auth0/nextjs-auth0/client'

const GroupCard = ({
	group,
	upvoted,
	downvoted,
}: {
	group: GroupRes
	upvoted: boolean
	downvoted: boolean
}) => {
	const cardRef = useRef(null)
	const router = useRouter()
	const { user } = useUser()
	const [votesDiff, setVotesDiff] = useState(group.votes_diff)
	const [upvoteClicked, setUpvoteClicked] = useState(upvoted)
	const [downvoteClicked, setDownvoteClicked] = useState(downvoted)
	const [clicked, setClicked] = useState(false)
	const [processing, setProcessing] = useState(false)

	useEffect(() => {
		setUpvoteClicked(upvoted)
	}, [upvoted])
	useEffect(() => {
		setUpvoteClicked(downvoted)
	}, [downvoted])

	useEffect(() => {
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

	function handle_link_click() {
		router.push(group.link)
	}

	function handle_edit_click() {
		router.push(`/groups/${group.group_id}`)
	}

	function getLinkIcon(link: string) {
		if (link.includes('https://t.me')) {
			return <TelegramIcon style={{ color: '#0088cc', fontSize: '40px' }} />
		} else if (link.includes('whatsapp')) {
			return <WhatsAppIcon style={{ color: '#25d366', fontSize: '40px' }} />
		} else {
			return <GroupsIcon style={{ color: '#0088cc', fontSize: '40px' }} />
		}
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

	return (
		<div className='mx-3 w-96 rounded-xl border border-gray-200 bg-white shadow'>
			<div
				className='relative'
				data-te-ripple-init
				data-te-ripple-color='light'
				ref={cardRef}
			>
				{clicked && (
					<div
						className='absolute bottom-0 left-0 right-0 top-0 z-10 h-full w-full overflow-hidden rounded-xl bg-black bg-fixed opacity-40 transition duration-300 ease-in-out'
						onClick={() => setClicked(!clicked)}
					></div>
				)}
				{clicked && group.created_by === user?.sub && (
					<div className='absolute left-0 top-0 flex h-full w-full items-center justify-around p-2'>
						<LaunchIcon
							color='primary'
							onClick={handle_link_click}
							className='z-20 cursor-pointer text-4xl'
						/>
						<EditIcon
							color='primary'
							onClick={handle_edit_click}
							className='z-20 cursor-pointer text-4xl'
							data-testid='edit-test-id'
						/>
					</div>
				)}
				{clicked && group.created_by !== user?.sub && (
					<div className='absolute left-0 top-0 flex h-full w-full items-center justify-center p-2'>
						<LaunchIcon
							color='primary'
							onClick={handle_link_click}
							className='z-20 cursor-pointer text-4xl'
						/>
					</div>
				)}
				<div className='flex px-4 py-2'>
					<div
						className='flex-grow cursor-pointer'
						onClick={() => setClicked(!clicked)}
					>
						<div className='flex items-center gap-4'>
							{getLinkIcon(group.link)}
							<h5 className='text-2xl font-semibold tracking-tight text-gray-900'>
								{group.title}
							</h5>
						</div>
						<div className='mb-2 mt-2 flex items-center justify-between'>
							<p className='font-normal text-gray-500'>{group.description}</p>
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
	)
}

export default GroupCard
