import Page from '@/components/page';
import { useRouter } from 'next/router';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';
import React, { useEffect, useRef, useState } from 'react';
import Error from '@/components/error';
import { useUserConfig } from '@/hooks/useUserConfig';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

const EditLocation = ({ lastRoute }) => {
  const router = useRouter();
  const { userConfig, update } = useUserConfig(router);
  const [error, setError] = useState(false);
  const [latitude, setLatitude] = useState<number>(
    userConfig?.latitude || null
  );
  const [longitude, setLongitude] = useState<number>(
    userConfig?.longitude || null
  );
  const [distance, setDistance] = useState(userConfig?.distance || '');
  const [city, setCity] = useState(userConfig?.city || '');
  const [cityFromAutocomplete, setCityFromAutocomplete] = useState(false);

  const autoCompleteRef = useRef(null);
  const locInputRef = useRef(null);

  useEffect(() => {
    if (userConfig?.distance) setDistance(userConfig.distance);
    if (userConfig?.city) setCity(userConfig.city);
    if (userConfig?.longitude) setLongitude(userConfig.longitude);
    if (userConfig?.latitude) setLatitude(userConfig.latitude);
  }, [userConfig]);

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
      setCity(place.name);
      setLatitude(place.geometry.location.lat());
      setLongitude(place.geometry.location.lng());
      setCityFromAutocomplete(true);
    });
  }, []);

  // Input Validation

  const [validationErrors, setValidationErrors] = useState({
    distance: null,
    city: null,
  });

  const isValidCity = (city) => {
    if (!city.trim()) return 'City is required';
    return null;
  };

  const isValidDistance = (distance) => {
    if (!distance) return 'Distance is required';
    return null;
  };

  const validateInputs = () => {
    const distanceError = isValidDistance(distance);
    const cityError = isValidCity(city);

    const errors = {
      distance: distanceError,
      city: cityError,
    };

    setValidationErrors(errors);

    let coordinatesError;
    if (!latitude || !longitude) {
      coordinatesError = 'Coordinates are required';
      console.error(coordinatesError);
    }

    // Check if any error is present
    return !Object.values(errors).some(Boolean) && !coordinatesError;
  };

  // Handle Events

  const onSubmit = async () => {
    const isFormValid = validateInputs();
    if (isFormValid) {
      if (!cityFromAutocomplete && city !== userConfig.city) {
        setValidationErrors({
          ...validationErrors,
          city: 'Please select a city from the autocomplete options.',
        });
        return;
      }
      await update({
        latitude,
        longitude,
        distance: Number(distance),
        city,
      });
      router.push({
        pathname: lastRoute,
        query: router.query,
      });


      const city_obj = { city, latitude, longitude };
      if (!window.localStorage.getItem('recent_cities')) {
        const cities = [city_obj];
        window.localStorage.setItem('recent_cities', JSON.stringify(cities));
      }
      else {
        const recent_cities = JSON.parse(window.localStorage.getItem('recent_cities'));
        if (recent_cities.length == 5) {
          recent_cities.shift();
        }
        if (recent_cities.find(item => item.latitude === latitude && item.longitude === longitude)) { return; }
        recent_cities.push(city_obj);
        window.localStorage.setItem('recent_cities', JSON.stringify(recent_cities));
      }
    }
  };

  const local_storage_cities = JSON.parse(window.localStorage.getItem('recent_cities'));

  const handleSelectedRecentCityChange = (event, newCity) => {
    const selected_city = local_storage_cities.find((city) => city.city == newCity);
    setCity(selected_city.city);
    setLatitude(selected_city.latitude);
    setLongitude(selected_city.longitude)
    setCityFromAutocomplete(true);
  };

  return (
    <Page>
      <div className="mx-auto max-w-xl">
        <div className="mx-3 my-7 flex flex-wrap justify-center gap-5">
          <h1 className="text-3xl w-full text-center">Aktualisiere deinen Ort</h1>
          {local_storage_cities && (
            <div className='flex-col'>
              <h1 className='text-center text-lg mb-2'>Select from recent cities</h1>
              <ToggleButtonGroup
                value={city}
                exclusive
                // onChange={handleAlignment}
                aria-label="text alignment"
                onChange={handleSelectedRecentCityChange}
                className='flex justify-center'
              >
                {local_storage_cities.reverse().map((city) => (
                  <ToggleButton value={city.city}>
                    {city.city}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          )}
          <TextField
            error={validationErrors.city != null}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
            }}
            id="outlined-basic"
            name="location"
            label="Ort"
            variant="outlined"
            fullWidth
            required
            inputRef={locInputRef}
            helperText={validationErrors.city}
          />
          <FormControl fullWidth>
            <InputLabel id="distance-select-label">Suchradius</InputLabel>
            <Select
              labelId="distance-select-label"
              id="distance-select"
              value={distance}
              label="Suchradius"
              onChange={(e) => {
                setDistance(e.target.value);
              }}
            >
              <MenuItem value={5}>5km</MenuItem>
              <MenuItem value={10}>10km</MenuItem>
              <MenuItem value={25}>25km</MenuItem>
              <MenuItem value={50}>50km</MenuItem>
              <MenuItem value={75}>75km</MenuItem>
              <MenuItem value={100}>100km</MenuItem>
              <MenuItem value={150}>150km</MenuItem>
              <MenuItem value={200}>200km</MenuItem>
              <MenuItem value={250}>250km</MenuItem>
              <MenuItem value={500}>500km</MenuItem>
              <MenuItem value={1000}>1000km</MenuItem>
              <MenuItem value={5000}>5000km</MenuItem>
              <MenuItem value={30000}>Global</MenuItem>
            </Select>
          </FormControl>
          {error && <Error setError={setError} />}
          <div className="mt-3 flex w-full flex-wrap justify-around">
            <Button
              variant="outlined"
              onClick={() => {
                router.push({
                  pathname: lastRoute,
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
              onClick={onSubmit}
              data-testid="submit"
            >
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </Page >
  );
};

export default EditLocation;
