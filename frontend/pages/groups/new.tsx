import Page from '@/components/page';
import { useRouter } from 'next/router';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import React, { useEffect, useRef, useState } from 'react';
import Spinner from '@/components/spinner';
import { type GroupReqBody } from '@/utils/backend_client';
import axios from 'axios';
import Error from '@/components/error';
import { useUser } from '@auth0/nextjs-auth0/client';

export const getServerSideProps = withPageAuthRequired();

const CreateGroup = () => {
  const { user } = useUser();
  const router = useRouter();

  const autoCompleteRef = useRef(null);
  const locInputRef = useRef(null);

  const [is_loading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [coordinates, setCoordinates] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [placeFromAutocomplete, setPlaceFromAutocomplete] = useState(false);

  useEffect(() => {
    const options = {
      fields: ['geometry', 'name', 'url'],
      types: ['locality'],
    };

    autoCompleteRef.current = new window.google.maps.places.Autocomplete(
      locInputRef.current,
      options
    );
    autoCompleteRef.current.addListener('place_changed', async function () {
      const place = await autoCompleteRef.current.getPlace();
      setLocation(place.name);
      setLocationUrl(place.url);

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCoordinates([lng, lat]);
      setPlaceFromAutocomplete(true);
    });
  }, []);

  // Input Validation

  const [validationErrors, setValidationErrors] = useState({
    title: null,
    description: null,
    link: null,
    location: null,
  });

  const isValidTitle = (title) => {
    const MAX_CHAR = 55;
    if (!title.trim()) return 'Title is required';
    if (title.length > MAX_CHAR) {
      return `Title is too long. ${title.length} > ${MAX_CHAR}`;
    }
    return null;
  };

  const isValidDescription = (description) => {
    const MAX_CHAR = 4000;
    if (description && description.length > MAX_CHAR) {
      return `Description is too long. ${description.length} > ${MAX_CHAR}`;
    }
    return null;
  };

  const isValidLink = (link) => {
    if (!title.trim()) return 'Link is required';
    if (link && !/^(http|https):\/\/[^ "]+$/.test(link)) {
      return 'Invalid link format';
    }
    return null;
  };

  const isValidLocation = (location) => {
    if (!location.trim()) return 'Location is required';
    if (!placeFromAutocomplete) {
      return 'Please select a city from the autocomplete options.';
    }
    return null;
  };

  const validateInputs = () => {
    const titleError = isValidTitle(title);
    const descriptionError = isValidDescription(description);
    const linkError = isValidLink(link);
    const locationError = isValidLocation(location);

    const errors = {
      title: titleError,
      description: descriptionError,
      link: linkError,
      location: locationError,
    };

    setValidationErrors(errors);

    const coordinatesError =
      coordinates.length === 0 ? 'Coordinates are required' : null;
    console.error(coordinatesError);

    const locationUrlError = !locationUrl.trim()
      ? 'Location URL is required'
      : null;
    console.error(locationUrlError);

    // Check if any error is present
    return (
      !Object.values(errors).some(Boolean) &&
      !coordinatesError &&
      !locationUrlError
    );
  };

  // Handle Events

  const handle_submit = async () => {
    const isFormValid = validateInputs();

    if (isFormValid) {
      try {
        const body: GroupReqBody = {
          title,
          description,
          link,
          location,
          locationUrl,
          coordinates,
        };
        if (link.trim()) body.link = link;
        setIsLoading(true);
        await axios.post(`/api/users/${user.sub}/groups`, body);
        router.push({
          pathname: '/groups',
          query: router.query,
        });
      } catch (error) {
        console.error(error);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Page>
      <div className="mx-auto max-w-xl">
        <div className="mx-3 my-7 flex flex-wrap justify-center gap-5">
          <h1 className="text-3xl">Neue Gruppe</h1>
          <TextField
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            error={!!validationErrors.title}
            helperText={validationErrors.title}
            name="group-title"
            label="Titel"
            variant="outlined"
            fullWidth
            required
          />
          <TextField
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            error={!!validationErrors.description}
            helperText={validationErrors.description}
            name="group-description"
            label="Beschreibung"
            variant="outlined"
            multiline
            fullWidth
            rows={3}
          />
          <TextField
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
            }}
            error={!!validationErrors.link}
            helperText={validationErrors.link}
            name="group-link"
            label="Link"
            variant="outlined"
            fullWidth
            required
          />
          <TextField
            error={validationErrors.location != null}
            value={location}
            onChange={(group) => {
              setLocation(group.target.value);
            }}
            id="outlined-basic"
            name="group-location"
            label="Ort"
            variant="outlined"
            fullWidth
            required
            inputRef={locInputRef}
            helperText={validationErrors.location}
          />
          {error && <Error setError={setError} />}
          <div className="mt-3 flex w-full flex-wrap justify-around">
            <Button
              variant="outlined"
              onClick={() => {
                router.push({
                  pathname: '/events',
                  query: router.query,
                });
              }}
            >
              Zurück
            </Button>
            <Button
              variant="contained"
              className="bg-blue-500"
              endIcon={<SendIcon />}
              onClick={handle_submit}
              disabled={is_loading}
              data-testid="submit"
            >
              Senden
            </Button>
          </div>
        </div>
      </div>
      <Spinner is_loading={is_loading} />
    </Page>
  );
};

export default CreateGroup;
