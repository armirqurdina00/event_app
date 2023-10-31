import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0'
import { NextApiRequest, NextApiResponse } from 'next'
import axios, { AxiosError } from 'axios'
import { OrderBy } from '../../utils/backend_client'

export default async function getEvents(
	req: NextApiRequest,
	res: NextApiResponse
) {
	try {
		if (req.method === 'GET') {
			const BASE_URL = process.env.BACKEND_URL

			const params = {
				page: Number(req.query.page),
				per_page: Number(req.query.per_page),
			}

			if (req.query.latitude) {
				params['latitude'] = Number(req.query.latitude)
			}
			if (req.query.longitude) {
				params['longitude'] = Number(req.query.longitude)
			}
			if (req.query.distance) {
				params['distance'] = Number(req.query.distance)
			}
			if (req.query.title) {
				params['title'] = String(req.query.title)
			}
			if (req.query.startUnixTime) {
				params['start_unix_time'] = Number(req.query.startUnixTime)
			}
			if (req.query.endUnixTime) {
				params['end_unix_time'] = Number(req.query.endUnixTime)
			}
			if (req.query.orderBy) {
				params['order_by'] = req.query.orderBy as OrderBy
			}

			const url = `${BASE_URL}/v1/events`

			const response = await axios.get(url, { params })

			res.status(200).json(response.data)
		} else {
			res.status(404).end()
		}
	} catch (err: any | AxiosError) {
		console.error('Error in getEvents: ', err)
		if (axios.isAxiosError(err)) {
			res.status(err.response?.status ?? 500).json(err)
		} else {
			res.status(500).json({ message: 'Internal Server Error' })
		}
	}
}
