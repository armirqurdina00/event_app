import React, { useState, useEffect } from 'react'
import Page from '@/components/page'
import GroupCard from '@/components/group-card'
import { GroupRes } from '../utils/backend_client'
import Fab from '@mui/material/Fab'
import { styled } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import { ButtonBase } from '@mui/material'
import { useRouter } from 'next/router'
import { useUser } from '@auth0/nextjs-auth0/client'
import { BackendClient } from '../utils/backend_client'

const PAGE_SIZE = 10

const StyledFab = styled(Fab)({
	position: 'fixed',
	zIndex: 40,
	bottom: 36,
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
	const { user } = useUser()
	const router = useRouter()
	const [groups, setGroups] = useState<GroupRes[]>(initialGroups)

	const login = () => {
		if (!user) router.push('/api/auth/login')
		router.push('/groups/new')
	}

	return (
		<Page>
			<div className='flex flex-wrap items-center justify-center gap-3 pt-4'>
				{groups.map((group) => (
					<GroupCard key={group.link} group={group} />
				))}
			</div>
			<ButtonBase onClick={login} component='div'>
				<StyledFab
					color='primary'
					className='bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 '
					aria-label='add'
				>
					<AddIcon />
				</StyledFab>
			</ButtonBase>
		</Page>
	)
}

export default Groups
