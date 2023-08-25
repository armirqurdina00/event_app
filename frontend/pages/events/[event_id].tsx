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
import React, { useState } from 'react'
import {
	EventReqBody,
	BackendClient,
	RecurringPattern,
} from '../../utils/backend_client'
import moment from 'moment'
import axios, { AxiosResponse } from 'axios'
import DeleteIcon from '@mui/icons-material/Delete'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { MuiFileInput } from 'mui-file-input'
import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import Error from '@/components/error'

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
	const router = useRouter()

	const [file, setFile] = React.useState(null)

	const [is_loading, setIsLoading] = useState(false)
	const [image_url, setImageURL] = useState(event.image_url)

	const [date, setDate] = useState(moment(event.unix_time))
	const [date_error, setDateError] = useState<boolean>(false)

	const [time, setTime] = useState(moment(event.unix_time))
	const [time_error, setTimeError] = useState<boolean>(false)

	const [title, setTitle] = useState(event.title)
	const [title_error, setTitleError] = useState<boolean>(false)

	const [location, setLocation] = useState(event.location)
	const [location_error, setLocationError] = useState<boolean>(false)

	const [link, setLink] = useState(event.link)
	const [link_error, setLinkError] = useState(false)

	const [recurring_pattern, setRecurringPattern] = useState<RecurringPattern>(
		event.recurring_pattern
	)

	const [error, setError] = useState(false)

	const handleRecurringPatternChange = (
		event: React.MouseEvent<HTMLElement>,
		new_recurring_pattern: RecurringPattern
	) => {
		setRecurringPattern(new_recurring_pattern ?? RecurringPattern.NONE)
	}

	const validate_inputs = () => {
		const titleError = !title.trim()
		const locationError = !location.trim()

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
			!dateError && !timeError && !titleError && !locationError && !linkError
		)
	}

	const handle_delete = async () => {
		try {
			await axios.delete(`/api/events/${event.event_id}`)
			router.push('/')
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
					link: link,
					recurring_pattern: recurring_pattern,
				}

				await axios.patch(`/api/events/${event.event_id}`, body)

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

					await axios.patch(`/api/events/${event.event_id}`, {
						image_url: response.data.url,
					})
				}

				router.push('/')
			} catch (error) {
				console.error('Error fetching data:', error)
			}
		}
	}

	return (
		<Page>
			<LocalizationProvider dateAdapter={AdapterMoment} adapterLocale='de'>
				<div className='mt-5 flex flex-wrap justify-center gap-10 px-10'>
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
					<MuiFileInput
						className='w-full'
						label='Bild'
						value={file}
						onChange={(file) => {
							setFile(file)
						}}
					/>
					{error && <Error setError={setError} />}
					<div className='flex w-full flex-nowrap justify-around'>
						<Button variant='outlined' onClick={() => router.push('/')}>
							{' '}
							Zurück
						</Button>
						<Button
							variant='contained'
							className='bg-blue-500'
							endIcon={<SendIcon />}
							onClick={handle_patch}
							disabled={is_loading}
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
