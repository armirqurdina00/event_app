import React from 'react'
import moment from 'moment'
import 'moment/locale/de'

const DayDisplay = ({ unix_time }) => {
	const eventMoment = moment(unix_time)
	const currentWeekNumber = moment().week()
	const eventWeekNumber = eventMoment.week()

	const getDay = () => {
		if (eventMoment.isSame(moment().subtract(1, 'day'), 'day')) {
			return renderDay('Gestern', eventMoment, unix_time)
		} else if (eventMoment.isSame(moment(), 'day')) {
			return renderDay('Heute', eventMoment, unix_time)
		} else if (eventMoment.isSame(moment().add(1, 'day'), 'day')) {
			return renderDay('Morgen', eventMoment, unix_time)
		} else if (eventWeekNumber === currentWeekNumber) {
			return renderWeekDay('Diesen', eventMoment, unix_time)
		} else if (eventWeekNumber === currentWeekNumber + 1) {
			return renderWeekDay('Nächste Woche', eventMoment, unix_time)
		} else if (eventWeekNumber === currentWeekNumber + 2) {
			return renderWeekDay('In zwei Wochen', eventMoment, unix_time)
		} else if (eventWeekNumber === currentWeekNumber + 3) {
			return renderWeekDay('In drei Wochen', eventMoment, unix_time)
		} else {
			return renderDefaultDay(eventMoment, unix_time)
		}
	}

	const renderDay = (label, eventMoment, unix_time) => (
		<div className='text-md flex items-baseline justify-between gap-2'>
			<span className='text-md font-medium'>
				<span className='text-red-500'>{label}</span> &middot;{' '}
				{`${eventMoment.format('dddd')}, ${eventMoment.format('DD.MM')}`}
			</span>
			<p className='text-sm'>{moment(unix_time).format('HH:mm ')}Uhr</p>
		</div>
	)

	const renderWeekDay = (label, eventMoment, unix_time) => (
		<div className='text-md flex items-baseline justify-between gap-2'>
			<span className='text-md font-medium'>
				{label}{' '}
				{`${eventMoment.format('dddd')}, ${eventMoment.format('DD.MM')}`}
			</span>
			<p className='text-sm'>{moment(unix_time).format('HH:mm ')}Uhr</p>
		</div>
	)

	const renderDefaultDay = (eventMoment, unix_time) => (
		<div className='text-md flex items-baseline justify-between gap-2'>
			<span className='text-md font-medium'>
				<span>
					{`${eventMoment.format('dd')}`}, {moment(unix_time).format('DD.MM')}
				</span>
			</span>
			<p className='text-sm'>{moment(unix_time).format('HH:mm ')}Uhr</p>
		</div>
	)

	return getDay()
}

export default DayDisplay
