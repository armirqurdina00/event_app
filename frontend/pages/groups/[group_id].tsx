import { withPageAuthRequired } from '@auth0/nextjs-auth0'
import {
    BackendClient,
    GroupReqBody,
} from '../../utils/backend_client'
import { useRouter } from 'next/router'
import React, { useState } from 'react'
import axios, { AxiosResponse } from 'axios'
import Page from '@/components/page'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Error from '@/components/error'
import SendIcon from '@mui/icons-material/Send'
import DeleteIcon from '@mui/icons-material/Delete'


export const getServerSideProps = withPageAuthRequired({
    getServerSideProps: async (context) => {
        const { group_id } = context.query

        const backend_client = new BackendClient({
            BASE: process.env.BACKEND_URL,
        })

        const group = await backend_client.groups.getGroup(group_id as string)

        return {
            props: { group },
        }
    },
})

const EditGroup = ({ group }) => {
    const router = useRouter()

    const [is_loading, setIsLoading] = useState(false)

    const [title, setTitle] = useState(group.title)
    const [title_error, setTitleError] = useState<boolean>(false)

    const [description, setDescription] = useState(group.description)
    const [description_error, setDescriptionError] = useState<boolean>(false)

    const [link, setLink] = useState(group.link)
    const [link_error, setLinkError] = useState(false)

    const [error, setError] = useState(false)

    const validate_inputs = () => {
        const titleError = !title.trim()
        const descriptionError = !description.trim()
        const linkError = link && !/^(http|https):\/\/[^ "]+$/.test(link)

        setTitleError(titleError)
        setDescriptionError(descriptionError)
        setLinkError(linkError)

        return (
            !titleError && !descriptionError && !linkError
        )
    }

    const handle_delete = async () => {
        try {
            await axios.delete(`/api/groups/${group.group_id}`)
            router.push('/groups')
        } catch (error) {
            console.error('Error fetching data:', error)
        }
    }

    const handle_patch = async () => {
        const isFormValid = validate_inputs()

        if (isFormValid) {
            try {
                const body: GroupReqBody = {
                    title: title,
                    description: description,
                    link: link,
                }

                await axios.patch(`/api/groups/${group.group_id}`, body)
                router.push('/groups')
            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }
    }

    return (
        <Page>
            <div className='mt-5 flex flex-wrap justify-center gap-10 px-10'>
                <TextField
                            error={title_error}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            id='outlined-basic'
                            name='group-title'
                            label='Titel'
                            variant='outlined'
                            fullWidth
                            required
                        />
                <TextField
                    error={description_error}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    id='outlined-basic'
                    name='group-description'
                    label='Ort'
                    variant='outlined'
                    fullWidth
                    required
                />
                <TextField
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    id='outlined-basic'
                    name='group-link'
                    label='Link'
                    variant='outlined'
                    fullWidth
                    error={link_error}
                    helperText={link_error && 'Please enter a valid URL'}
                />
                {error && <Error setError={setError} />}
					<div className='flex w-full flex-nowrap justify-around'>
						<Button variant='outlined' onClick={() => router.push('/groups')}>
							{' '}
							Zurück
						</Button>
						<Button
							variant='contained'
							className='bg-blue-500'
							endIcon={<SendIcon />}
							onClick={handle_patch}
							disabled={is_loading}
						>
							Speichern
						</Button>
					</div>
					<div className='mt-10 flex w-full flex-wrap justify-center '>
						<Button
							variant='contained'
							className='bg-red-500'
							endIcon={<DeleteIcon />}
							onClick={handle_delete}
						>
							Löschen
						</Button>
					</div>
            </div>
        </Page>
    )

}

export default EditGroup