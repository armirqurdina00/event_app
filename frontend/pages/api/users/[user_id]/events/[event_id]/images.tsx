import { withApiAuthRequired, getAccessToken } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';
import { parseForm } from '../../../../../../utils/parse-form';
import { type ImageRes } from '../../../../../../utils/backend_client';
import path from 'path';
import FormData from 'form-data';
import axios, { type AxiosResponse } from 'axios';

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
      try {
        const { files, chunks } = await parseForm(req);

        const contents = Buffer.concat(chunks);

        const formData = new FormData();

        formData.append('file', contents, {
          filename: path.basename(files.media[0].filepath),
          contentType: 'image/jpg'
        });

        const { accessToken: access_token } = await getAccessToken(req, res);

        const headers = {
          Authorization: `Bearer ${access_token}`,
          ...formData.getHeaders()
        };

        const response2: AxiosResponse<ImageRes> = await axios.post(
          `${process.env.BACKEND_URL}/v1/users/${
            req.query.user_id
          }/events/${String(req.query.event_id)}/images`,
          formData,
          {
					  headers
          }
        );

        res.status(200).json(response2.data);
      } catch (error) {
        if (error.code === 1009) {
          // Handle the file size exceeded error here
          console.error('File size exceeded the limit:', error.message);
          res.status(413).json({ error: 'File size exceeded the limit' });
        } else {
          // Handle other errors
          console.error('Error:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      }
    } else {
      res.status(404).end();
    }
  }
);

export const config = {
  api: {
    bodyParser: false
  }
};
