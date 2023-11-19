import Page from '@/components/page';
import Error from '@/components/error';
import { useRouter } from 'next/router';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import 'moment/locale/de';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import React, { useEffect, useRef, useState } from 'react';
import {
  type EventReqBody,
  RecurringPattern,
} from '../../utils/backend_client';
import moment from 'moment';
import axios from 'axios';
import Spinner from '@/components/spinner';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Image from 'next/image';

export const getServerSideProps = withPageAuthRequired();

const CreateEvent = ({ user }) => {
  const router = useRouter();

  const inputRef = useRef(null);
  const autoCompleteRef = useRef(null);
  const locInputRef = useRef(null);

  const get_default_time = () => {
    let time;
    const currentTime = moment();
    const desiredTime = moment().set({ hour: 20, minute: 0 });

    if (currentTime.isAfter(desiredTime)) {
      time = currentTime.add(1, 'day').set({ hour: 20, minute: 0 });
    } else {
      time = desiredTime;
    }

    return time;
  };

  const [is_loading, setIsLoading] = useState(false);
  const [date, setDate] = useState(get_default_time());
  const [time, setTime] = useState(get_default_time());
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [coordinates, setCoordinates] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [recurring_pattern, setRecurringPattern] = useState<RecurringPattern>(
    RecurringPattern.NONE
  );
  const [error, setError] = useState(false);
  const [file, setFile] = useState(null);
  const [image_url, setImageURL] = useState(
    'https://res.cloudinary.com/dqolsfqjt/image/upload/v1692633904/placeholder-16x9-1_vp8x60.webp'
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [placeFromAutocomplete, setPlaceFromAutocomplete] = useState(false);

  useEffect(() => {
    const options = {
      fields: ['address_components', 'geometry', 'name', 'url'],
    };

    autoCompleteRef.current = new window.google.maps.places.Autocomplete(
      locInputRef.current,
      options
    );
    autoCompleteRef.current.addListener('place_changed', async function () {
      const place = await autoCompleteRef.current.getPlace();

      // Extract the city name from the address components
      let cityName = '';
      const addressComponents = place.address_components || [];
      for (const component of addressComponents) {
        if (component.types.includes('locality')) {
          cityName = component.long_name;
          break;
        }
      }

      // Combine city name and place name if they are different
      let combinedName = place.name;
      if (cityName && !place.name.includes(cityName)) {
        combinedName = `${cityName}, ${place.name}`;
      }

      setLocation(combinedName);
      setLocationUrl(place.url);

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setCoordinates([lng, lat]);
      setPlaceFromAutocomplete(true);
    });
  }, []);

  // Validation

  const [validationErrors, setValidationErrors] = useState({
    date: null,
    time: null,
    title: null,
    location: null,
    description: null,
  });

  const isValidTitle = (title) => {
    const MAX_CHAR = 55;
    if (!title.trim()) return 'Title is required';
    if (title.length > MAX_CHAR) {
      return `Title is too long. ${title.length} > ${MAX_CHAR}`;
    }
    return null;
  };

  const isValidDateTime = (date, time) => {
    const currentMoment = moment();
    const selectedDateTime = moment(date).set({
      hour: time.get('hour'),
      minute: time.get('minute'),
    });
    if (!date || selectedDateTime.isBefore(currentMoment)) {
      return 'Invalid date or time';
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

  const isValidDescription = (description) => {
    const MAX_CHAR = 4000;
    if (description && description.length > MAX_CHAR) {
      return `Description is too long. ${description.length} > ${MAX_CHAR}`;
    }
    return null;
  };

  const validateInputs = () => {
    const titleError = isValidTitle(title);
    const dateError = isValidDateTime(date, time);
    const locationError = isValidLocation(location);
    const descriptionError = isValidDescription(description);

    const errors = {
      date: dateError,
      time: dateError, // Note: I'm using the same dateError because it's based on both date and time
      title: titleError,
      location: locationError,
      description: descriptionError,
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
      const combined_date_time = moment(
        `${date.format('YYYY-MM-DD')} ${time.format('HH:mm')}`,
        'YYYY-MM-DD HH:mm'
      );
      const unix_timestamp = combined_date_time.valueOf();

      try {
        const body: EventReqBody = {
          unix_time: unix_timestamp,
          title,
          description,
          location,
          locationUrl,
          coordinates,
        };

        if (image_url) body.image_url = image_url;
        if (recurring_pattern) body.recurring_pattern = recurring_pattern;

        setIsLoading(true);
        const response = await axios.post(
          `/api/users/${user.sub}/events`,
          body
        );

        const event_id = response.data.event_id;

        if (file) {
          const formData = new FormData();
          formData.append('media', file);
          const response_2 = await axios.post(
            `/api/users/${user.sub}/events/${event_id}/images`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          await axios.patch(`/api/users/${user.sub}/events/${event_id}`, {
            image_url: response_2.data.url,
          });
        }

        router.push({
          pathname: '/events',
          query: router.query,
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEdit = () => {
    inputRef.current.click();
  };

  const handleFileChange = (event) => {
    const fileObj = event.target.files?.[0];
    if (!fileObj) {
      return;
    }
    const objectURL = URL.createObjectURL(fileObj);
    event.target.value = null;
    setFile(fileObj);
    setImageURL(objectURL);
  };

  const handleRecurringPatternChange = (
    event: React.MouseEvent<HTMLElement>,
    new_recurring_pattern: RecurringPattern
  ) => {
    setRecurringPattern(new_recurring_pattern);
  };

  const handle_fullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Page>
      <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale="de">
        <div className="mx-auto max-w-xl">
          <div className="my-7 flex justify-center">
            <h1 className="text-3xl">Neues Event</h1>
          </div>
          <div className="relative mx-3">
            <Image
              className={'event-img-16-9 rounded-t-xl object-cover'}
              src={image_url}
              alt="Event Picture"
              layout="responsive"
              width={16}
              height={9}
              objectFit="cover"
              quality={100}
              data-testid="event-picture"
              unoptimized={true}
              onClick={handle_fullscreen}
            />
            {isFullscreen && (
              <div
                className="fixed left-0 top-0 z-50 flex h-screen w-screen items-center justify-center overflow-y-auto bg-black bg-opacity-70"
                onClick={handle_fullscreen}
              >
                <img src={image_url} alt="Description" />
              </div>
            )}
            <div className="absolute left-0 top-0 flex w-full cursor-pointer justify-between p-2">
              <div>
                <input
                  style={{ display: 'none' }}
                  ref={inputRef}
                  type="file"
                  onChange={handleFileChange}
                  data-testid="input-test-id"
                />
              </div>
              <button
                className="rounded-full bg-black bg-opacity-40 p-1"
                onClick={handleEdit}
                data-testid="edit-test-id"
              >
                <EditIcon color="primary" className="z-20 text-3xl" />
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-5 px-3">
            <div className="flex w-full flex-nowrap justify-between gap-4">
              <DatePicker
                value={date}
                onChange={(date) => {
                  setDate(date);
                }}
                label="Datum"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: validationErrors.date != null,
                    helperText: validationErrors.date,
                  },
                }}
              />
              <ToggleButtonGroup
                color="primary"
                value={recurring_pattern}
                exclusive
                onChange={handleRecurringPatternChange}
                aria-label="Platform"
              >
                <ToggleButton value={RecurringPattern.WEEKLY}>
                  weekly
                </ToggleButton>
              </ToggleButtonGroup>
            </div>
            <MobileTimePicker
              value={time}
              onChange={(time) => {
                setTime(time);
              }}
              label="Zeit"
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: validationErrors.time != null,
                  helperText: validationErrors.time,
                },
              }}
            />
            <TextField
              error={validationErrors.title != null}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              id="outlined-basic"
              name="event-title"
              label="Titel"
              variant="outlined"
              fullWidth
              required
              helperText={validationErrors.title}
            />
            <TextField
              error={validationErrors.location != null}
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
              }}
              id="outlined-basic"
              name="event-location"
              label="Ort"
              variant="outlined"
              fullWidth
              required
              inputRef={locInputRef}
              helperText={validationErrors.location}
            />
            <TextField
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              error={!!validationErrors.description}
              helperText={validationErrors.description}
              name="group-description"
              label="Details zu Tickets, Musik & Workshops eingeben..."
              variant="outlined"
              multiline
              fullWidth
              rows={15}
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
                {' '}
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
      </LocalizationProvider>
    </Page>
  );
};

export default CreateEvent;
