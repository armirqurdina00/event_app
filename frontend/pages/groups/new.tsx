import Page from '@/components/page'
import { useRouter } from 'next/router'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import SendIcon from '@mui/icons-material/Send'
import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import React, { useState } from 'react'
import Spinner from '@/components/spinner'
import { GroupReqBody } from '@/utils/backend_client'
import axios from 'axios'
import Error from '@/components/error'
import { useUser } from '@auth0/nextjs-auth0/client'

export const getServerSideProps = withPageAuthRequired()

const CreateGroup = () => {
	const { user } = useUser()
	const router = useRouter()
	const [is_loading, setIsLoading] = useState<boolean>(false)

	const [title, setTitle] = useState('')
	const [title_error, setTitleError] = useState<boolean>(false)

	const [description, setDescription] = useState('')
	const [description_error, setDescriptionError] = useState<boolean>(false)

	const [link, setLink] = useState('')
	const [link_error, setLinkError] = useState<boolean>(false)

	const [error, setError] = useState(false)

	const validateInputs = () => {
		const titleError = !title.trim()
		const descriptionError = !description.trim()
		const linkError = !link.trim() || !/^(http|https):\/\/[^ "]+$/.test(link)

		setTitleError(titleError)
		setDescriptionError(descriptionError)
		setLinkError(linkError)

		return !titleError && !descriptionError && !linkError
	}

	const handle_submit = async () => {
		const isFormValid = validateInputs()

		if (isFormValid) {
			const body: GroupReqBody = {
				title,
				description,
				link,
			}
			if (link.trim()) body.link = link
			setIsLoading(true)
			const response = await axios.post(`/api/users/${user.sub}/groups`, body)
			const group_id = response.data.group_id
			router.push('/groups')
		}
	}

	return (
		<Page>
			<div className='mt-6 flex flex-wrap justify-center gap-10 px-10'>
				<TextField
					error={title_error}
					value={title}
					onChange={(group) => setTitle(group.target.value)}
					id='outlined-basic'
					name='group-title'
					label='Titel'
					variant='outlined'
					fullWidth
					required
				/>
				<TextField
					error={description_error}
					value={description}
					onChange={(group) => setDescription(group.target.value)}
					id='outlined-basic'
					name='group-description'
					label='Beschreibung'
					variant='outlined'
					fullWidth
					required
				/>
				<TextField
					value={link}
					onChange={(group) => setLink(group.target.value)}
					id='outlined-basic'
					name='group-link'
					label='Link'
					variant='outlined'
					fullWidth
					error={link_error}
					helperText={link_error && 'Please enter a valid URL'}
					required
				/>
				{error && <Error setError={setError} />}
				<div className='flex w-full flex-wrap justify-around'>
					<Button variant='outlined' onClick={() => router.push('/groups')}>
						{' '}
						Zurück
					</Button>
					<Button
						variant='contained'
						className='bg-blue-500'
						endIcon={<SendIcon />}
						onClick={handle_submit}
						disabled={is_loading}
						data-testid='submit'
					>
						Senden
					</Button>
				</div>
			</div>
			<Spinner is_loading={is_loading} />
		</Page>
	)
}

export default CreateGroup
