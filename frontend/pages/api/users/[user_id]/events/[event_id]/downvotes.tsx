import { getAccessToken } from '@auth0/nextjs-auth0';
import { type NextApiRequest, type NextApiResponse } from 'next';
import { BackendClient } from '../../../../../../utils/backend_client';
import axios from 'axios';

export default async function postDownvotes (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { accessToken: access_token } = await getAccessToken(req, res);

    const backend_client = new BackendClient({
      BASE: process.env.BACKEND_URL,
      TOKEN: access_token
    });

    if (req.method === 'POST') {
      const response = await backend_client.events.postDownvotes(
        String(req.query.user_id),
        String(req.query.event_id)
      );

      res.status(200).json(response);
    } else if (req.method === 'DELETE') {
      const response = await backend_client.events.deleteDownvotes(
        String(req.query.user_id),
        String(req.query.event_id)
      );

      res.status(200).json(response);
    } else {
      res.status(404).end();
    }
  } catch (err: unknown | import('axios').AxiosError) {
    console.error('Error in postDownvotes: ', err);
    if (axios.isAxiosError(err)) {
      res.status(err.response.status).json(err);
    }
    const status = (err as { status?: number }).status;
    res.status(status ?? 500).json(err);
  }
}
