import { DataGrid } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";
import "./HistoryBlock.css";
import getHistory from "../../../Api_requests/getHistory";
import formatTime from "../../../utils/formatTime";
import trimString from "../../../utils/trimString";
import BaseDataGrid from "../../UI/BaseDataGrid/BaseDataGrid";
import { Box, CircularProgress } from "@mui/material";

const columns = [
  {
    field: "id",
    headerName: "#",
    width: 40,
  },
  {
    field: "tournament",
    headerName: "Tournament",
    width: 150,
    editable: false,
  },
  {
    field: "team",
    headerName: "Team",
    width: 150,
    editable: false,
  },

  {
    field: "discipline",
    headerName: "Discipline",
    width: 150,
    editable: false,
  },
  {
    field: "stage",
    headerName: "Stage",
    width: 120,
    editable: false,
  },
  {
    field: "is_battle",
    headerName: "Battle",
    width: 100,
    editable: false,
  },
  {
    field: "bust_price",
    headerName: "Bust value",
    width: 120,
    editable: false,
  },
  {
    field: "skip_price",
    headerName: "Skip value",
    width: 120,
    editable: false,
  },
  {
    field: "bust_count",
    headerName: "Bust count",
    width: 120,
    editable: false,
  },

  {
    field: "skip_count",
    headerName: "Skip count",
    width: 120,
    editable: false,
  },
  {
    field: "result_time",
    headerName: "Result time",
    width: 140,
    editable: false,
  },
  {
    field: "actual_time",
    headerName: "Actual time",
    width: 140,
    editable: false,
  },
];

const CustomNoRowsOverlay = () => {
  return (
    <Box
      display="flex"
      height="100%"
      justifyContent="center"
      alignItems="center"
      fontSize="24px"
      fontWeight="600"
    >
      History is empty
    </Box>
  );
};

const HistoryBlock = () => {
  const [renderedData, setRenderedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDataHandler = useCallback(async () => {
    setIsLoading(true);
    const data = await getHistory();

    setRenderedData(
      data.map((row, i) => ({
        ...row,
        id: i + 1,
        result_time: formatTime(row.result_time).fullTime(),
        actual_time: formatTime(row.actual_time).fullTime(),
        isEven: i % 2 === 0,
        is_battle: row.is_battle ? "Yes" : "No",
        tournament: trimString(row.tournament, 10, true),
        team: trimString(row.team, 10, true),
        discipline: trimString(row.discipline, 12, true),
        stage: trimString(row.stage, 10, true),
      }))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDataHandler();
  }, [fetchDataHandler]);

  return (
    <Box className="history__container">
      <BaseDataGrid
        loading={isLoading}
        className="history__table"
        rows={renderedData || []}
        columns={columns}
        disableColumnFilter={true}
        disableColumnMenu={true}
        getRowClassName={(params) => `row_style row_${params.row.isEven}`}
        disableVirtualization
        components={{
          NoRowsOverlay: CustomNoRowsOverlay,
        }}
      />
    </Box>
  );
};

export default HistoryBlock;
