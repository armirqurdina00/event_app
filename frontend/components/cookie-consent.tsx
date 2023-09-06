import React, { useEffect, useState } from 'react'

const CookieConsent = () => {
	const [showConsent, setShowConsent] = useState(false)

	useEffect(() => {
		setShowConsent(!localStorage.getItem('localConsent'))
	}, [])

	const acceptCookie = () => {
		localStorage.setItem('localConsent', 'true')
		setShowConsent(false)
	}

	if (!showConsent) {
		return null
	}

	return (
		<div className='fixed inset-0 z-40 bg-slate-700 bg-opacity-70'>
			<div className='fixed bottom-0 left-0 right-0 flex items-center justify-between bg-gray-100 px-4 py-4'>
				<span className='text-dark mr-6 text-xs sm:text-xl'>
					Diese Website verwendet Kekse. Durch die Nutzung unserer Website
					stimmen Sie allen Keksen gemäß unserer Kekse-Richtlinie zu.
				</span>
				<button
					className='rounded bg-green-500 px-8 py-2 text-white'
					onClick={acceptCookie}
				>
					Akzeptieren
				</button>
			</div>
		</div>
	)
}

export default CookieConsent
