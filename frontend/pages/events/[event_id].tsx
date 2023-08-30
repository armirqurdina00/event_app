import Page from '@/components/page'
import { useRouter } from 'next/router'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker'
import 'moment/locale/de'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import SendIcon from '@mui/icons-material/Send'
import React, { useEffect, useRef, useState } from 'react'
import {
	EventReqBody,
	BackendClient,
	RecurringPattern,
} from '../../utils/backend_client'
import moment from 'moment'
import axios from 'axios'
import DeleteIcon from '@mui/icons-material/Delete'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import Error from '@/components/error'
import EditIcon from '@mui/icons-material/Edit'
import { useUser } from '@auth0/nextjs-auth0/client'

export const getServerSideProps = withPageAuthRequired({
	getServerSideProps: async (context) => {
		const { event_id } = context.query

		const backend_client = new BackendClient({
			BASE: process.env.BACKEND_URL,
		})

		const event = await backend_client.events.getEvent(event_id as string)

		return {
			props: { event },
		}
	},
})

const EditEvent = ({ event }) => {
	const { user } = useUser()
	const cardRef = useRef(null)
	const inputRef = useRef(null)
	const router = useRouter()

	const autoCompleteRef = useRef(null);
	const locInputRef = useRef(null);

	const options = {
		componentRestrictions: { country: "de" },
		fields: ["geometry", "name"],
		types: ["locality"]
	}

	const [is_loading, setIsLoading] = useState(false)

	const [date, setDate] = useState(moment(event.unix_time))
	const [date_error, setDateError] = useState<boolean>(false)

	const [time, setTime] = useState(moment(event.unix_time))
	const [time_error, setTimeError] = useState<boolean>(false)

	const [title, setTitle] = useState(event.title)
	const [title_error, setTitleError] = useState<boolean>(false)

	const [location, setLocation] = useState(event.location)
	const [location_error, setLocationError] = useState<boolean>(false)

	const [coordinates, setCoordinates] = useState<number[]>(event.coordinates)

	const [link, setLink] = useState(event.link)
	const [link_error, setLinkError] = useState(false)

	const [recurring_pattern, setRecurringPattern] = useState<RecurringPattern>(
		event.recurring_pattern
	)

	const [error, setError] = useState(false)

	const [clicked, setClicked] = useState(false)

	const [file, setFile] = React.useState(null)
	const [image_url, setImageURL] = useState(event.image_url)

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
	}, [])

	useEffect(() => {
		autoCompleteRef.current = new window.google.maps.places.Autocomplete(
			locInputRef.current,
			options
		);
		autoCompleteRef.current.addListener("place_changed", async function () {
			const place = await autoCompleteRef.current.getPlace();
			setLocation(place.name)
			const lat = place.geometry.location.lat()
			const lng = place.geometry.location.lng()
			setCoordinates([lat, lng])
		});
	}, []);

	const handleRecurringPatternChange = (
		event: React.MouseEvent<HTMLElement>,
		new_recurring_pattern: RecurringPattern
	) => {
		setRecurringPattern(new_recurring_pattern ?? RecurringPattern.NONE)
	}

	const validate_inputs = () => {
		const titleError = !title.trim()
		const locationError = !location.trim()

		const coordinatesError = coordinates.length < 1 ? true : false

		const now = moment()
		const selectedDateTime = moment(
			`${date.format('YYYY-MM-DD')} ${time.format('HH:mm')}`,
			'YYYY-MM-DD HH:mm'
		)
		const dateError = !date || selectedDateTime.isBefore(now)
		const timeError = !time || selectedDateTime.isBefore(now)
		const linkError = link && !/^(http|https):\/\/[^ "]+$/.test(link)

		setDateError(dateError)
		setTimeError(timeError)
		setTitleError(titleError)
		setLocationError(locationError)
		setLinkError(linkError)

		return (
			!dateError && !timeError && !titleError && !locationError && !coordinatesError && !linkError
		)
	}

	const handle_delete = async () => {
		try {
			await axios.delete(`/api/users/${user.sub}/events/${event.event_id}`)
			router.push('/events')
		} catch (error) {
			console.error('Error fetching data:', error)
		}
	}

	const handle_patch = async () => {
		const isFormValid = validate_inputs()

		if (isFormValid) {
			const combined_date_time = moment(
				`${date.format('YYYY-MM-DD')} ${time.format('HH:mm')}`,
				'YYYY-MM-DD HH:mm'
			)
			const unix_timestamp = combined_date_time.valueOf()

			try {
				const body: EventReqBody = {
					unix_time: unix_timestamp,
					title: title,
					location: location,
					coordinates: coordinates,
					link: link,
					recurring_pattern: recurring_pattern,
				}

				await axios.patch(
					`/api/users/${user.sub}/events/${event.event_id}`,
					body
				)

				if (file) {
					const formData = new FormData()
					formData.append('media', file)
					const response = await axios.post(
						`/api/events/${event.event_id}/images`,
						formData,
						{
							headers: {
								'Content-Type': 'multipart/form-data',
							},
						}
					)

					await axios.patch(`/api/users/${user.sub}/events/${event.event_id}`, {
						image_url: response.data.url,
					})
				}

				router.push('/events')
			} catch (error) {
				console.error('Error fetching data:', error)
				setError(true)
			}
		}
	}

	const handleEdit = () => {
		inputRef.current.click()
	}

	const handleFileChange = (event) => {
		const fileObj = event.target.files && event.target.files[0]
		if (!fileObj) {
			return
		}
		const objectURL = URL.createObjectURL(fileObj)
		event.target.value = null
		setFile(fileObj)
		setImageURL(objectURL)
	}

	return (
		<Page>
			<LocalizationProvider dateAdapter={AdapterMoment} adapterLocale='de'>
				<div className='mt-5 flex flex-wrap justify-center gap-10 px-10'>
					<div className='relative' ref={cardRef}>
						<img
							className={`event-img-16-9 cursor-pointer bg-black object-cover`}
							src={image_url}
							alt='Event Picture'
							onClick={() => setClicked(!clicked)}
						/>
						{clicked && (
							<div
								className='absolute bottom-0 left-0 right-0 top-0 z-10 h-full w-full overflow-hidden bg-black bg-fixed opacity-40 transition duration-300 ease-in-out'
								onClick={() => setClicked(!clicked)}
							></div>
						)}
						{clicked && (
							<div className='absolute left-0 top-0 flex h-full w-full cursor-pointer items-end justify-between p-2'>
								<div>
									<input
										style={{ display: 'none' }}
										ref={inputRef}
										type='file'
										onChange={handleFileChange}
									/>
								</div>
								<EditIcon
									color='primary'
									onClick={handleEdit}
									className='z-20 cursor-pointer text-4xl'
									data-testid='edit-test-id'
								/>
							</div>
						)}
					</div>
					<div className='flex w-full flex-nowrap justify-between gap-4'>
						<DatePicker
							value={date}
							onChange={(date) => setDate(date)}
							label='Datum'
							slotProps={{
								textField: {
									fullWidth: true,
									required: true,
									error: date_error,
								},
							}}
						/>
						<ToggleButtonGroup
							color='primary'
							value={recurring_pattern}
							exclusive
							onChange={handleRecurringPatternChange}
							aria-label='Platform'
						>
							<ToggleButton value={RecurringPattern.WEEKLY}>
								weekly
							</ToggleButton>
						</ToggleButtonGroup>
					</div>
					<MobileTimePicker
						value={time}
						onChange={(time) => setTime(time)}
						label='Zeit'
						slotProps={{
							textField: {
								fullWidth: true,
								required: true,
								error: time_error,
							},
						}}
					/>
					<TextField
						error={title_error}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						id='outlined-basic'
						name='event-title'
						label='Titel'
						variant='outlined'
						fullWidth
						required
					/>
					<TextField
						error={location_error}
						value={location}
						onChange={(event) => setLocation(event.target.value)}
						id='outlined-basic'
						name='event-location'
						label='Ort'
						variant='outlined'
						fullWidth
						required
						inputRef={locInputRef}
					/>
					<TextField
						value={link}
						onChange={(event) => setLink(event.target.value)}
						id='outlined-basic'
						name='event-link'
						label='Link'
						variant='outlined'
						fullWidth
						error={link_error}
						helperText={link_error && 'Please enter a valid URL'}
					/>
					{error && <Error setError={setError} />}
					<div className='flex w-full flex-nowrap justify-around'>
						<Button variant='outlined' onClick={() => router.push('/events')}>
							{' '}
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
					<div className='mt-10 flex w-full flex-wrap justify-center '>
						<Button
							variant='contained'
							className='bg-red-500'
							endIcon={<DeleteIcon />}
							onClick={handle_delete}
							data-testid='delete'
						>
							Löschen
						</Button>
					</div>
				</div>
			</LocalizationProvider>
		</Page>
	)
}

export default EditEvent
