import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0'
import { NextApiRequest, NextApiResponse } from 'next'
import { BackendClient } from '../../../../../utils/backend_client'
import axios, { AxiosError } from 'axios'

export default withApiAuthRequired(async function patchEvents(
	req: NextApiRequest,
	res: NextApiResponse
) {
	try {
		const { accessToken: access_token } = await getAccessToken(req, res)

		const backend_client = new BackendClient({
			BASE: process.env.BACKEND_URL,
			TOKEN: access_token,
		})

		if (req.method === 'PATCH') {
			const response = await backend_client.events.patchEvent(
				String(req.query.user_id),
				String(req.query.event_id),
				req.body
			)
			res.status(200).json(response)
		} else if (req.method === 'DELETE') {
			const response = await backend_client.events.deleteEvent(
				String(req.query.user_id),
				String(req.query.event_id)
			)
			res.status(200).json(response)
		} else {
			res.status(404).end()
		}
	} catch (err: any | AxiosError) {
		console.error('Error in patchEvents: ', err)
		if (axios.isAxiosError(err)) {
			res.status(err.response.status).json(err)
		}
		res.status(err?.status ?? 500).json(err)
	}
})
