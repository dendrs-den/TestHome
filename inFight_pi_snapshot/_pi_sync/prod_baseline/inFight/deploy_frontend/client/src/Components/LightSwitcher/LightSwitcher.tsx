import { FormControlLabel, Switch } from "@mui/material";
import { useEffect, useState } from "react";
import getLightStatus from "../../Api_requests/getLightStatus";
import switchLight from "../../Api_requests/switchLight";

const LightSwitcher = () => {
  const [checked, setChecked] = useState<boolean>(true);

  const fetchStatus = async (): Promise<boolean | never> => {
    try {
      const { is_on } = await getLightStatus();

      setChecked(is_on);
      return is_on;
    } catch (error) {
      return;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleChange = async ({ target }) => {
    await switchLight(target.checked);
    // setChecked(target.checked);
    await fetchStatus();
    // setChecked(await fetchStatus());
  };
  return (
    <FormControlLabel
      color="info"
      value={checked}
      checked={checked}
      onChange={handleChange}
      control={<Switch color="primary" />}
      label="LED"
      labelPlacement="top"
    />
  );
};

export default LightSwitcher;
