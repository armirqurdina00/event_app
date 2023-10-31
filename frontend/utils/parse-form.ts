import type { NextApiRequest } from 'next'
import formidable from 'formidable'
import { Writable } from 'stream'

const fileConsumer = (acc) => {
	const writable = new Writable({
		write: (chunk, _enc, next) => {
			acc.push(chunk)
			next()
		}
	})

	return writable
}

export const parseForm = async (
	req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files; chunks: Uint8Array[] }> => {
	return new Promise(async (resolve, reject) => {
		const chunks = []

		const form = formidable({
			maxFiles: 2,
			maxFileSize: 6 * 1024 * 1024, // 6mb
			fileWriteStreamHandler: () => fileConsumer(chunks),

			filter: (part) => {
				return part.name === 'media' && (part.mimetype?.includes('image') || false)
			}
		})

		form.parse(req, function (err, fields, files) {
			if (err) reject(err)
			else resolve({ fields, files, chunks })
		})
	})
}
