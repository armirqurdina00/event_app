import React, { useEffect, useState } from 'react'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { useRouter } from 'next/router'

const Error = ({ setError }) => {
	const router = useRouter()

	return (
		<div
			className='relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700'
			role='alert'
		>
			<p className='mb-2'>
				<strong className='font-bold'>Holy smokes!</strong>
			</p>

			<p className='mb-2'>Something seriously bad happened.</p>

			<div
				className='flex cursor-pointer items-center'
				onClick={() =>
					router.push('https://api.whatsapp.com/send?phone=004917641952181')
				}
			>
				<WhatsAppIcon style={{ color: '#25d366', fontSize: '20px' }} />
				<span className='ml-2'>Contact me!</span>
			</div>

			<span className='absolute bottom-0 right-0 top-0 px-4 py-3'>
				<svg
					className='h-6 w-6 fill-current text-red-500'
					role='button'
					xmlns='http://www.w3.org/2000/svg'
					viewBox='0 0 20 20'
					onClick={() => setError(false)}
				>
					<title>Close</title>
					<path d='M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z' />
				</svg>
			</span>
		</div>
	)
}

export default Error
