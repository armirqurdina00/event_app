import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0';
import { type NextApiRequest, type NextApiResponse } from 'next';
import { BackendClient } from '../../../../../utils/backend_client';
import axios from 'axios';

export default withApiAuthRequired(async function patchGroups(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { accessToken: access_token } = await getAccessToken(req, res);

    const backend_client = new BackendClient({
      BASE: process.env.BACKEND_URL,
      TOKEN: access_token,
    });

    if (req.method === 'PATCH') {
      const response = await backend_client.groups.patchGroup(
        String(req.query.user_id),
        String(req.query.group_id),
        req.body
      );
      res.status(200).json(response);
    } else if (req.method === 'GET') {
      const response = await backend_client.groups.getUserGroup(
        String(req.query.user_id),
        String(req.query.group_id)
      );
      res.status(200).json(response);
    } else if (req.method === 'DELETE') {
      const response = await backend_client.groups.deleteGroup(
        String(req.query.user_id),
        String(req.query.group_id)
      );
      res.status(200).json(response);
    } else {
      res.status(404).end();
    }
  } catch (err: unknown | import('axios').AxiosError) {
    console.error('Error in patchGroups: ', err);
    if (axios.isAxiosError(err)) {
      res.status(err.response.status).json(err);
    }
    const status = (err as { status?: number }).status;
    res.status(status ?? 500).json(err);
  }
});
