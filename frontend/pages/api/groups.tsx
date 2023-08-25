import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0'
import { NextApiRequest, NextApiResponse } from 'next'
import { BackendClient } from '../../utils/backend_client'
import axios, { AxiosError } from 'axios'

export default async function postGroups(
	req: NextApiRequest,
	res: NextApiResponse
) {
	try {
		if (req.method === 'POST') {
			const { accessToken: access_token } = await getAccessToken(req, res)

			const backend_client = new BackendClient({
				BASE: process.env.BACKEND_URL,
				TOKEN: access_token,
			})

			const response = await backend_client.groups.postGroups(req.body)
			res.status(200).json(response)
		} else if (req.method === 'GET') {
			const backend_client = new BackendClient({
				BASE: process.env.BACKEND_URL,
			})

			const response = await backend_client.groups.getGroups(
				Number(req.query.page),
				Number(req.query.per_page)
			)
			res.status(200).json(response)
		} else {
			res.status(404).end()
		}
	} catch (err: any | AxiosError) {
		console.error('Error in postGroups: ', err)
		if (axios.isAxiosError(err)) {
			res.status(err.response.status).json(err)
		}
		res.status(err?.status ?? 500).json(err)
	}
}
