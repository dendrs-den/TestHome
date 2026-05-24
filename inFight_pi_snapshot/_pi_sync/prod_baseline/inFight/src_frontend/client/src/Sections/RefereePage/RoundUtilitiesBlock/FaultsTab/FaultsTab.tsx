import {
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import formatTime from "../../../../utils/formatTime";
import { Box } from "@mui/material";

import classes from "./FaultsTab.module.css";
import FaultsDataGrid from "./FaultsDataGrid/FaultsDataGrid";
// Regular expression for 4-digit seconds input
const re = /^\d{0,4}$/;

const FaultsTab = (props) => {
  const { factTime, addFault, editFault, deleteFault, faultsList } = props;
  const [secMaxValue, setSecMaxValue] = useState(0);
  const [secValue, setSecValue] = useState<string>("0000");
  const [typeValue, setTypeValue] = useState<string>("");
  const [inputsAreValid, setInputsAreValid] = useState<boolean>(false);

  useEffect(() => {
    if (factTime !== 0) {
      setSecMaxValue(Math.floor(Number(factTime) / 1000));
    }
  }, [factTime]);

  const secondsChangeHandler = ({ target }) => {
    if (!re.test(target.value)) return;
    setSecValue(target.value);
  };

  const typeChangeHandler = (event) => {
    setTypeValue(event.target.value);
  };

  useEffect(() => {
    const enteredTime = Number(secValue) * 1000;

    setInputsAreValid(enteredTime < factTime);
  }, [secValue, factTime]);

  const addNewFault = () => {
    // convert entered total seconds into milliseconds
    const faultInMilleSec = Number(secValue) * 1000;

    if (typeValue && faultInMilleSec) {
      addFault(typeValue, faultInMilleSec);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box className={classes["header"]}>
        <Box sx={{ fontWeight: "400", fontSize: "1.5rem", color: "#3c2bfe" }}>
          Penalties list
        </Box>
        <Box display="flex" maxHeight="70px">
          <FormControl error={!inputsAreValid}>
            <Box display="flex" gap="10px" pb="3px">
              <FormControl
                fullWidth
                error={!re.test(secValue) || Number(secValue) > secMaxValue}
                sx={{ maxWidth: "140px" }}
              >
                <InputLabel htmlFor="seconds">SEC</InputLabel>
                <OutlinedInput
                  label="Seconds (SSSS)"
                  id="seconds"
                  onChange={secondsChangeHandler}
                  onBlur={() =>
                    setSecValue((prev) =>
                      prev.length < 1 ? "0000" : prev.padStart(4, "0")
                    )
                  }
                  value={secValue}
                  sx={{
                    maxWidth: "140px",
                    px: "10px",
                  }}
                />
              </FormControl>

              <FormControl fullWidth sx={{ maxWidth: "100px" }}>
                <InputLabel id="demo-simple-select-label">Type</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={typeValue}
                  label="Type"
                  onChange={typeChangeHandler}
                >
                  <MenuItem value={"bust"}>Bust</MenuItem>
                  <MenuItem value={"skip"}>Skip</MenuItem>
                </Select>
              </FormControl>
              <Button
                sx={{
                  minWidth: "100px",
                  ml: "10px",
                }}
                disabled={
                  !["bust", "skip"].includes(typeValue) ||
                  !secValue ||
                  !inputsAreValid
                }
                variant="outlined"
                onClick={addNewFault}
              >
                Add
              </Button>
            </Box>

            <FormHelperText sx={{ mx: "0" }}>
              {!inputsAreValid && "entered time exceeds possible"}
              {inputsAreValid && "."}
            </FormHelperText>
          </FormControl>
        </Box>
      </Box>

      <Box mt="15px" border="1px solid #d3d3d3">
        <FaultsDataGrid
          faultsList={faultsList || []}
          editFault={editFault}
          deleteFault={deleteFault}
        />
      </Box>
      <Typography component="div" fontSize="20px" mt="25px">
        Round duration:
        <Chip
          size="medium"
          variant="info"
          sx={{ fontSize: "20px", marginLeft: "10px", borderRadius: "10px" }}
          label={formatTime(factTime).fullTime()}
        />
      </Typography>
    </Box>
  );
};

export default FaultsTab;

