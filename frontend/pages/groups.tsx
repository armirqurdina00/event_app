import React, { useState, useEffect, useRef, useContext } from 'react'
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
import LocationContext from '../utils/location-context'

const PAGE_SIZE = 10

export const getServerSideProps = async (context) => {
	const backendClient = new BackendClient({
		BASE: process.env.BACKEND_URL,
	})

	let longitude = Number(context.query.longitude)
	let latitude = Number(context.query.latitude)

	if (!longitude || !latitude) {
		return {
			props: { initialGroups: [] },
		}
	}

	const { items: initialGroups } = await backendClient.groups.getGroups(
		1,
		PAGE_SIZE,
		latitude,
		longitude
	)

	return {
		props: { initialGroups },
	}
}

const Groups: React.FC<{ initialGroups: GroupRes[] }> = ({ initialGroups }) => {
	const router = useRouter()
	const { location, setLocation } = useContext(LocationContext)
	const { user } = useUser()
	const [page, setPage] = useState(initialGroups.length === 0 ? 1 : 2)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const [groups, setGroups] = useState<GroupRes[]>(initialGroups)
	const [userUpvotes, setUserUpvotes] = useState<GroupIds>([])
	const [userDownvotes, setUserDownvotes] = useState<GroupIds>([])
	const [isSwiped, setIsSwiped] = useState(false)

	useEffect(() => {
		if (initialGroups.length === 0) loadMore()
	}, [location])

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

	const loadMore = async () => {
		if (loading || !hasMore) return

		setLoading(true)

		try {
			const response = await fetch(
				`/api/groups?page=${page}&per_page=${PAGE_SIZE}&latitude=${location.latitude}&longitude=${location.latitude}`
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
			setIsSwiped(!isSwiped)
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
				<div className={`${isSwiped && 'slideOutToRightAnimation'}`}>
					<InfiniteScroll
						dataLength={groups.length}
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
						{groups.map((group, index) => (
							<GroupCard
								key={index}
								group={group}
								upvoted={userUpvotes.indexOf(group.group_id) !== -1}
								downvoted={userDownvotes.indexOf(group.group_id) !== -1}
							/>
						))}
					</InfiniteScroll>
				</div>
			</Page>
		</div>
	)
}

export default Groups
