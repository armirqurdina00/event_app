import { NextApiRequest, NextApiResponse } from 'next';
import { BackendClient, CityRes } from '../../../utils/backend_client';
import axios from 'axios';

export default async function getlocations(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const backendClient = new BackendClient({
      BASE: process.env.BACKEND_URL,
    });

    if (req.method === 'GET') {
      const response: CityRes = await backendClient.locations.getCity(
        Number(req.query.lat),
        Number(req.query.lng)
      );
      res.status(200).json(response);
    } else {
      res.status(404).end();
    }
  } catch (err) {
    console.error('Error in getlocations: ', err);
    if (axios.isAxiosError(err)) {
      res.status(err.response.status).json(err);
    }
    res.status(err?.status ?? 500).json(err);
  }
}
