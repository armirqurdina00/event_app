import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0'
import type { NextApiRequest, NextApiResponse } from 'next'
import { parseForm } from '../../../../../../utils/parse-form'
import { ImageRes } from '../../../../../../utils/backend_client'
import path from 'path'
import FormData from 'form-data'
import axios, { AxiosResponse } from 'axios'

export default withApiAuthRequired(
	async (req: NextApiRequest, res: NextApiResponse) => {
		if (req.method === 'POST') {
			try {
				const { files, chunks } = await parseForm(req)

				const contents = Buffer.concat(chunks)

				const formData = new FormData()

				formData.append('file', contents, {
					filename: path.basename(files.media[0].filepath),
					contentType: 'image/jpg',
				})

				const { accessToken: access_token } = await getAccessToken(req, res)

				const headers = {
					Authorization: `Bearer ${access_token}`,
					...formData.getHeaders(),
				}

				const response2: AxiosResponse<ImageRes> = await axios.post(
					`${process.env.BACKEND_URL}/v1/users/${req.query.user_id}/events/${String(
						req.query.event_id
					)}/images`,
					formData,
					{
						headers: headers,
					}
				)

				res.status(200).json(response2.data)
			} catch (e) {
				console.error(e)
				res.status(500).json({ data: null, error: 'Internal Server Error' })
			}
		} else {
			res.status(404).end()
		}
	}
)

export const config = {
	api: {
		bodyParser: false,
	},
}
