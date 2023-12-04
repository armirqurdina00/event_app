import { NextApiRequest, NextApiResponse } from 'next';
import { BackendClient, GroupRes } from '../../../../utils/backend_client';
import axios from 'axios';

export default async function postGroupsJoins(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backendClient = new BackendClient({
      BASE: process.env.BACKEND_URL,
    });

    if (req.method === 'POST') {
      const response: GroupRes = await backendClient.groups.postGroupsJoins(
        req.query.group_id as string
      );

      res.status(200).json(response);
    } else {
      res.status(404).end();
    }
  } catch (err) {
    console.error('Error in postGroupsJoins: ', err);
    if (axios.isAxiosError(err)) {
      res.status(err.response.status).json(err);
    }
    res.status(err?.status ?? 500).json(err);
  }
}
