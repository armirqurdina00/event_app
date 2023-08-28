import React, { useState, useEffect, useRef } from 'react'
import Page from '@/components/page'
import GroupCard from '@/components/group-card'
import { GroupIds, GroupRes, GroupsRes } from '../utils/backend_client'
import Fab from '@mui/material/Fab'
import { styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { ButtonBase } from '@mui/material'
import { useRouter } from 'next/router'
import { useUser } from '@auth0/nextjs-auth0/client'
import { BackendClient } from '../utils/backend_client'
import InfiniteScroll from 'react-infinite-scroll-component'
import axios, { AxiosResponse } from 'axios'

const PAGE_SIZE = 10

const StyledFab = styled(Fab)({
	position: 'fixed',
	zIndex: 40,
	bottom: 8,
	left: 0,
	right: 0,
	margin: '0 auto',
	backgroundColor: 'none',
})

export const getServerSideProps = async () => {
	const backendClient = new BackendClient({
		BASE: process.env.BACKEND_URL,
	})

	const { items: initialGroups } = await backendClient.groups.getGroups(
		1,
		PAGE_SIZE
	)

	return {
		props: { initialGroups },
	}
}

const Groups: React.FC<{ initialGroups: GroupRes[] }> = ({ initialGroups }) => {
	const router = useRouter()
	const { user } = useUser()
	const [page, setPage] = useState(2)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(initialGroups.length == PAGE_SIZE)
	const [groups, setGroups] = useState<GroupRes[]>(initialGroups)
	const [userUpvotes, setUserUpvotes] = useState<GroupIds>([])
	const [userDownvotes, setUserDownvotes] = useState<GroupIds>([])

	useEffect(() => {
		if (user?.sub) loadUserVotes()
	}, [user])

	const loadUserVotes = async function () {
		const upvotes: AxiosResponse<string[]> = await axios.get(
			`/api/users/${user.sub}/groups/upvotes`
		)
		setUserUpvotes(upvotes.data)

		const downvotes: AxiosResponse<string[]> = await axios.get(
			`/api/users/${user.sub}/groups/downvotes`
		)
		setUserDownvotes(downvotes.data)
	}

	const login = () => {
		if (!user) router.push('/api/auth/login')
		router.push('/groups/new')
	}

	const loadMore = async () => {
		if (loading || !hasMore) return

		setLoading(true)

		try {
			const response = await fetch(
				`/api/groups?page=${page}&per_page=${PAGE_SIZE}`
			)

			const data: GroupsRes = await response.json()

			const newGroups = data.items

			if (newGroups.length < PAGE_SIZE) {
				setHasMore(false)
			}

			if (newGroups.length === 0) {
				setLoading(false)
				return
			}

			setPage((page) => page + 1)
			setGroups((prevGroups) => [...prevGroups, ...newGroups])
		} catch (error) {
			console.error('Error loading more groups:', error)
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
		const isRightSwipe = distance < -minSwipeDistance

		if (isRightSwipe) {
			router.push('/events')
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
				<InfiniteScroll
					dataLength={groups.length}
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
					{groups.map((group, index) => (
						<GroupCard
							key={index}
							group={group}
							upvoted={userUpvotes.indexOf(group.group_id) !== -1}
							downvoted={userDownvotes.indexOf(group.group_id) !== -1}
						/>
					))}
				</InfiniteScroll>
				<ButtonBase onClick={login} component='div'>
					<StyledFab
						size='small'
						color='primary'
						className='bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 '
						aria-label='add'
					>
						<AddIcon />
					</StyledFab>
				</ButtonBase>
			</Page>
		</div>
	)
}

export default Groups
