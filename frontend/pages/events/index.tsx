import Page from '@/components/page'
import Error from '@/components/error'
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
import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import React, { useState } from 'react'
import { EventReqBody, RecurringPattern } from '../../utils/backend_client'
import moment from 'moment'
import axios from 'axios'
import Spinner from '@/components/spinner'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import { MuiFileInput } from 'mui-file-input'

export const getServerSideProps = withPageAuthRequired()

const CreateEvent = ({ user }) => {
	const router = useRouter()

	const [file, setFile] = React.useState(null)

	const [is_loading, setIsLoading] = useState(false)
	const [image_url, setImageURL] = useState(null)

	const get_default_time = () => {
		let time
		const currentTime = moment()
		const desiredTime = moment().set({ hour: 20, minute: 0 })

		if (currentTime.isAfter(desiredTime)) {
			time = currentTime.add(1, 'day').set({ hour: 20, minute: 0 })
		} else {
			time = desiredTime
		}

		return time
	}

	const [date, setDate] = useState(get_default_time())
	const [date_error, setDateError] = useState<boolean>(false)

	const [time, setTime] = useState(get_default_time())
	const [time_error, setTimeError] = useState<boolean>(false)

	const [title, setTitle] = useState('')
	const [title_error, setTitleError] = useState<boolean>(false)

	const [location, setLocation] = useState('')
	const [location_error, setLocationError] = useState<boolean>(false)

	const [link, setLink] = useState('')
	const [link_error, setLinkError] = useState(false)

	const [recurring_pattern, setRecurringPattern] = useState<RecurringPattern>(
		RecurringPattern.NONE
	)

	const [error, setError] = useState(false)

	const handleRecurringPatternChange = (
		event: React.MouseEvent<HTMLElement>,
		new_recurring_pattern: RecurringPattern
	) => {
		setRecurringPattern(new_recurring_pattern)
	}

	const validateInputs = () => {
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

	const handle_submit = async () => {
		const isFormValid = validateInputs()

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
				}

				if (link.trim()) body.link = link
				if (image_url) body.image_url = image_url
				if (recurring_pattern) body.recurring_pattern = recurring_pattern

				setIsLoading(true)
				const response = await axios.post('/api/events', body)

				const event_id = response.data.event_id

				if (file) {
					const formData = new FormData()
					formData.append('media', file)
					const response_2 = await axios.post(
						`/api/events/${event_id}/images`,
						formData,
						{
							headers: {
								'Content-Type': 'multipart/form-data',
							},
						}
					)

					await axios.patch(`/api/events/${event_id}`, {
						image_url: response_2.data.url,
					})
				}

				router.push('/')
				// router.replace(router.asPath);
			} catch (error) {
				console.error('Error fetching data:', error)
				setError(true)
			} finally {
				setIsLoading(false)
			}
		}
	}

	return (
		<Page>
			<LocalizationProvider dateAdapter={AdapterMoment} adapterLocale='de'>
				<div className='mt-6 flex flex-wrap justify-center gap-10 px-10'>
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
					<div className='flex w-full flex-wrap justify-around'>
						<Button variant='outlined' onClick={() => router.push('/')}>
							{' '}
							Zurück
						</Button>
						<Button
							variant='contained'
							className='bg-blue-500'
							endIcon={<SendIcon />}
							onClick={handle_submit}
							disabled={is_loading}
						>
							Senden
						</Button>
					</div>
				</div>
				<Spinner is_loading={is_loading} />
			</LocalizationProvider>
		</Page>
	)
}

export default CreateEvent
