import { getAccessToken } from '@auth0/nextjs-auth0';
import { type NextApiRequest, type NextApiResponse } from 'next';
import { BackendClient } from '../../../../utils/backend_client';
import axios from 'axios';

export default async function postUserGroups (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      const { accessToken: access_token } = await getAccessToken(req, res);

      const backend_client = new BackendClient({
        BASE: process.env.BACKEND_URL,
        TOKEN: access_token
      });

      const response = await backend_client.groups.postGroups(
        String(req.query.user_id),
        req.body
      );
      res.status(200).json(response);
    } else {
      res.status(404).end();
    }
  } catch (err: unknown | import('axios').AxiosError) {
    console.error('Error in postUserGroups: ', err);
    if (axios.isAxiosError(err)) {
      res.status(err.response.status).json(err);
    }
    const status = (err as { status?: number }).status;
    res.status(status ?? 500).json(err);
  }
}
