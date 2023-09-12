import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import { BackendClient, GroupReqBody } from '../../utils/backend_client'
import { useRouter } from 'next/router'
import React, { useEffect, useRef, useState } from 'react'
import axios, { AxiosResponse } from 'axios'
import Page from '@/components/page'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Error from '@/components/error'
import SendIcon from '@mui/icons-material/Send'
import DeleteIcon from '@mui/icons-material/Delete'
import { useUser } from '@auth0/nextjs-auth0/client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import Spinner from '@/components/spinner'
import WarningIcon from '@mui/icons-material/Warning'

const style = {
	position: 'absolute' as 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: '90vw',
	maxWidth: '400px',
	bgcolor: 'background.paper',
	border: '2px solid #000',
	boxShadow: 24,
	p: 4,
}

export const getServerSideProps = withPageAuthRequired({
	getServerSideProps: async (context) => {
		const { group_id } = context.query

		const backend_client = new BackendClient({
			BASE: process.env.BACKEND_URL,
		})

		const group = await backend_client.groups.getGroup(group_id as string)

		return {
			props: { group },
		}
	},
})

const EditGroup = ({ group }) => {
	const { user } = useUser()
	const router = useRouter()

	const autoCompleteRef = useRef(null)
	const locInputRef = useRef(null)

	const [is_loading, setIsLoading] = useState(false)
	const [title, setTitle] = useState(group.title)
	const [description, setDescription] = useState(group.description)
	const [link, setLink] = useState(group.link)
	const [location, setLocation] = useState(group.location)
	const [locationUrl, setLocationUrl] = useState(group.locationUrl)
	const [coordinates, setCoordinates] = useState<number[]>(group.coordinates)
	const [error, setError] = useState(false)

	useEffect(() => {
		const options = {
			componentRestrictions: { country: 'de' },
			fields: ['geometry', 'name', 'url'],
			types: ['locality'],
		}

		autoCompleteRef.current = new window.google.maps.places.Autocomplete(
			locInputRef.current,
			options
		)
		autoCompleteRef.current.addListener('place_changed', async function () {
			const place = await autoCompleteRef.current.getPlace()
			setLocation(place.name)
			setLocationUrl(place.url)

			const lat = place.geometry.location.lat()
			const lng = place.geometry.location.lng()
			setCoordinates([lng, lat])
		})
	}, [])

	// Input Validation

	const [validationErrors, setValidationErrors] = useState({
		title: null,
		description: null,
		link: null,
		location: null,
	})

	const isValidTitle = (title) => {
		const MAX_CHAR = 55
		if (!title.trim()) return 'Title is required'
		if (title.length > MAX_CHAR)
			return `Title is too long. ${title.length} > ${MAX_CHAR}`
		return null
	}

	const isValidDescription = (description) => {
		const MAX_CHAR = 150
		if (!description.trim()) return 'Description is required'
		if (description.length > MAX_CHAR)
			return `Description is too long. ${description.length} > ${MAX_CHAR}`
		return null
	}

	const isValidLink = (link) => {
		if (link && !/^(http|https):\/\/[^ "]+$/.test(link))
			return 'Invalid link format'
		return null
	}

	const isValidLocation = (location) => {
		if (!location.trim()) return 'Location is required'
		return null
	}

	const validateInputs = () => {
		const titleError = isValidTitle(title)
		const descriptionError = isValidDescription(description)
		const linkError = isValidLink(link)
		const locationError = isValidLocation(location)

		const errors = {
			title: titleError,
			description: descriptionError,
			link: linkError,
			location: locationError,
		}

		setValidationErrors(errors)

		const coordinatesError =
			coordinates.length === 0 ? 'Coordinates are required' : null
		console.error(coordinatesError)

		const locationUrlError = !locationUrl.trim()
			? 'Location URL is required'
			: null
		console.error(locationUrlError)

		// Check if any error is present
		return (
			!Object.values(errors).some(Boolean) &&
			!coordinatesError &&
			!locationUrlError
		)

		// Check if any error is present
		return !Object.values(errors).some(Boolean)
	}

	// Handle Events

	const handle_delete = async () => {
		try {
			setIsLoading(true)
			await axios.delete(`/api/users/${user.sub}/groups/${group.group_id}`)
			router.push('/groups')
		} catch (error) {
			console.error(error)
			setError(true)
		} finally {
			setIsLoading(false)
		}
	}

	const handle_patch = async () => {
		const isFormValid = validateInputs()

		if (isFormValid) {
			try {
				const body: GroupReqBody = {
					title: title,
					description: description,
					link: link,
					location: location,
					locationUrl: locationUrl,
					coordinates: coordinates,
				}
				setIsLoading(true)
				await axios.patch(
					`/api/users/${user.sub}/groups/${group.group_id}`,
					body
				)
				router.push('/groups')
			} catch (error) {
				console.error(error)
				setError(true)
			} finally {
				setIsLoading(false)
			}
		}
	}

	// Error

	const [modalOpen, setModalOpen] = useState(false)
	const handleModalOpen = () => setModalOpen(true)
	const handleModalClose = () => setModalOpen(false)

	return (
		<Page>
			<div className='mx-auto max-w-xl'>
				<div className='mx-3  my-7 flex flex-wrap justify-center gap-5'>
					<h1 className='text-3xl'>Bearbeite Gruppe</h1>
					<TextField
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						error={!!validationErrors.title}
						helperText={validationErrors.title}
						name='group-title'
						label='Titel'
						variant='outlined'
						fullWidth
						required
					/>
					<TextField
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						error={!!validationErrors.description}
						helperText={validationErrors.description}
						name='group-description'
						label='Beschreibung'
						variant='outlined'
						multiline
						fullWidth
						required
						rows={3}
					/>
					<TextField
						value={link}
						onChange={(e) => setLink(e.target.value)}
						error={!!validationErrors.link}
						helperText={validationErrors.link}
						name='group-link'
						label='Link'
						variant='outlined'
						fullWidth
					/>
					<TextField
						error={validationErrors.location != null ? true : false}
						value={location}
						onChange={(event) => setLocation(event.target.value)}
						id='outlined-basic'
						name='event-location'
						label='Ort'
						variant='outlined'
						fullWidth
						required
						inputRef={locInputRef}
						helperText={validationErrors.location}
					/>
					{error && <Error setError={setError} />}
					<div className='mt-3 flex w-full flex-nowrap justify-around'>
						<Button variant='outlined' onClick={() => router.push('/groups')}>
							Zurück
						</Button>
						<Button
							variant='contained'
							className='bg-blue-500'
							endIcon={<SendIcon />}
							onClick={handle_patch}
							disabled={is_loading}
							data-testid='submit'
						>
							Speichern
						</Button>
					</div>
					<div className='mx-5 flex w-full  items-center px-4 opacity-40'>
						<div className='flex-1 rounded-full border-t-4 border-red-500'></div>
						<span className='mx-2 px-2 text-red-500'>
							<WarningIcon className='text-5xl' />
						</span>
						<div className='flex-1 border-t-4 border-red-500'></div>
					</div>

					<div className='flex justify-center'>
						<Button
							variant='contained'
							className='bg-red-500'
							endIcon={<DeleteIcon />}
							onClick={handleModalOpen}
							data-testid='delete'
						>
							Löschen
						</Button>
					</div>
				</div>
			</div>
			<Modal
				open={modalOpen}
				onClose={handleModalClose}
				aria-labelledby='modal-modal-title'
				className='z-40'
			>
				<Box sx={style}>
					<Typography id='modal-modal-title' variant='h6' component='h2'>
						Möchtest du die Gruppe wirklich löschen?
					</Typography>
					<div className='mt-5 flex justify-center'>
						<Button
							variant='contained'
							className='bg-red-500'
							endIcon={<DeleteIcon />}
							onClick={handle_delete}
							data-testid='delete-confirmation'
						>
							Löschen
						</Button>
					</div>
				</Box>
			</Modal>
			<Spinner is_loading={is_loading} />
		</Page>
	)
}

export default EditGroup
