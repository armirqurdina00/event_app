import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const SelectDistance = ({ distance, setDistance }) => {

    return (
        <div className='flex justify-center pt-4'>
            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                <InputLabel id="demo-select-small-label">Distance</InputLabel>
                <Select
                    labelId="demo-select-small-label"
                    id="demo-select-small"
                    value={distance}
                    label="Distance"
                    onChange={(e: SelectChangeEvent) => setDistance(e.target.value as string)}
                >
                    <MenuItem value={1}>1km</MenuItem>
                    <MenuItem value={5}>5km</MenuItem>
                    <MenuItem value={10}>10km</MenuItem>
                </Select>
            </FormControl>
        </div>
    );
}

export default SelectDistance;