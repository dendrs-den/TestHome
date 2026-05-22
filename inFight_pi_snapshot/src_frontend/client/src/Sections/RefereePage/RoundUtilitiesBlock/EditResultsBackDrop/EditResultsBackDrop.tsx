import {
  Backdrop,
  Button,
  CircularProgress,
  Tab,
  Tabs,
  Box,
} from "@mui/material";

import React, { useCallback, useState } from "react";
import { useEffect } from "react";
import editCrosses from "../../../../Api_requests/editCrosses";
import editFaults from "../../../../Api_requests/editFaults";
import getAllCrosses from "../../../../Api_requests/getAllCrosses";
import getAllFaults from "../../../../Api_requests/getAllFaults";
import getCurrentRound from "../../../../Api_requests/rounds/getCurrentRound";
import { Fault } from "../../../../types/general_types";
import CrossesTab from "../CrossesTab/CrossesTab";
import FaultsTab from "../FaultsTab/FaultsTab";

const EditResultsBackDrop = (props) => {
  const { open, setOpen } = props;
  const [isTouched, setIsTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [faultsData, setFaultsData] = useState<Fault[]>([]);
  const [crossesData, setCrossesData] = useState([]);
  const [factTime, setFactTime] = useState(null);

  const fetchRoundResults = useCallback(async () => {
    setIsLoading(true);
    const receivedCrosses = await getAllCrosses();
    const receivedFaults = await getAllFaults();
    const roundGeneralData = await getCurrentRound();

    setCrossesData(receivedCrosses);
    setFaultsData(receivedFaults);
    setFactTime(roundGeneralData?.time_real);

    setIsLoading(false);
  }, []);

  const deleteCross = async (pos: number) => {
    if (crossesData.length > 2) {
      const newCrossData = crossesData.filter((cross, i) => i !== pos);
      // await editCrosses(newCrossData);
      // setCrossesData(await getAllCrosses());

      setCrossesData(newCrossData);
    } else {
      console.log("Must be at least 2 crosses");
      return;
    }
    setIsTouched(true);
  };

  const addFault = useCallback(
    async (type, timeStamp) => {
      console.log(faultsData);
      const newFault = {
        device_id: 0,
        device_type: "terminal",
        time: timeStamp,
        type,
        valid: true,
      };

      setFaultsData([...faultsData, newFault]);
      setIsTouched(true);
    },
    [faultsData]
  );

  // EDIT (MAKE VALID) SELECTED FAULT BY SENDING NEW MODIFIED FAULT LIST
  const editFault = useCallback(
    async (rowId, isValid) => {
      const newFaultData = faultsData.map((fault: Fault, i) => {
        return {
          ...fault,
          valid: rowId === i ? isValid : fault.valid,
        };
      });

      setFaultsData(newFaultData);
      setIsTouched(true);
    },
    [faultsData]
  );

  // DELETE SELECTED FAULT BY SENDING NEW FILTERED FAULT LIST
  const deleteFault = useCallback(
    async (rowId) => {
      const newFaultData = faultsData.filter((fault, i) => i !== rowId);
      setFaultsData(newFaultData);
      setIsTouched(true);
    },
    [faultsData]
  );

  const handleChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const saveAndRefetch = useCallback(async () => {
    await editFaults(faultsData);
    await editCrosses(crossesData);
    fetchRoundResults();
    setIsTouched(false);
  }, [crossesData, faultsData, fetchRoundResults]);

  function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
      <div role="tabpanel" hidden={value !== index} {...other}>
        {value === index && <Box>{children}</Box>}
      </div>
    );
  }

  useEffect(() => {
    if (open) {
      fetchRoundResults();
    }
  }, [open, fetchRoundResults]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={open}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          maxWidth: "800px",
          height: "700px",
          backgroundColor: "#fcfcfc",
          boxShadow:
            "0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)",
          borderRadius: "28px",
          color: "#000",
          padding: "25px",
        }}
      >
        {isLoading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
          >
            <CircularProgress size="100px" color="info" />
          </Box>
        )}
        {!isLoading && (
          <Box>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "lightGray",
                bgcolor: "background.paper",
              }}
            >
              <Tabs value={tabValue} onChange={handleChange} centered>
                <Tab value={0} label="Penalties" />
                <Tab value={1} label="Crosses list" />
              </Tabs>
            </Box>
            <Box minHeight="400px">
              <TabPanel value={tabValue} index={0}>
                <FaultsTab
                  faultsList={faultsData}
                  factTime={factTime || 0}
                  addFault={addFault}
                  editFault={editFault}
                  deleteFault={deleteFault}
                />
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <CrossesTab
                  crossesList={crossesData}
                  deleteCross={deleteCross}
                />
              </TabPanel>
            </Box>
          </Box>
        )}
        <Box display="flex" justifyContent="end" gap="15px" mt={3}>
          <Button
            onClick={() => setOpen(false)}
            color="error"
            variant="outlined"
          >
            Close
          </Button>
          <Button
            disabled={!isTouched}
            onClick={saveAndRefetch}
            sx={{ backgroundColor: "#3c2bfe" }}
            variant="contained"
          >
            Save
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};

export default EditResultsBackDrop;
