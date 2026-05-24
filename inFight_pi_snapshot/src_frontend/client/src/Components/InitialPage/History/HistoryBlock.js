import { DataGrid } from "@mui/x-data-grid";
import { useCallback, useEffect, useState } from "react";
import "./HistoryBlock.css";
import getHistory from "../../../Api_requests/getHistory";
import formatTime from "../../../utils/formatTime";
import trimString from "../../../utils/trimString";
import BaseDataGrid from "../../UI/BaseDataGrid/BaseDataGrid";
import { Box, Button } from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

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
  const [rawHistoryData, setRawHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDataHandler = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getHistory();
      console.log("HISTORY: ", data);
      setRawHistoryData(Array.isArray(data) ? data : []);
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataHandler();
  }, [fetchDataHandler]);

  const exportHistoryToExcel = () => {
    const rows = Array.isArray(rawHistoryData) ? rawHistoryData : [];
    if (!rows.length) return;

    const formatExportTime = (value) =>
      formatTime(value || 0).fullTime().replace(".", ",");

    const columnsForExport = [
      ["#", "Tournament", "Team", "Discipline", "Stage", "Battle", "Bust value", "Skip value", "Bust count", "Skip count", "Result time", "Actual time"],
      ...rows.map((row, index) => {
        const bustCount = Array.isArray(row?.faults)
          ? row.faults.filter((fault) => fault?.type === "bust" && fault?.valid !== false).length
          : Number(row?.bust_count || 0);
        const skipCount = Array.isArray(row?.faults)
          ? row.faults.filter((fault) => fault?.type === "skip" && fault?.valid !== false).length
          : Number(row?.skip_count || 0);

        return [
          index + 1,
          row?.tournament || "",
          row?.team || "",
          row?.discipline || "",
          row?.stage || "",
          row?.is_battle ? "Yes" : "No",
          row?.bust_price ?? "",
          row?.skip_price ?? "",
          bustCount,
          skipCount,
          formatExportTime(row?.result_time),
          formatExportTime(row?.actual_time),
        ];
      }),
    ];

    const csvContent = columnsForExport
      .map((line) =>
        line
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(
      2,
      "0"
    )}`;

    downloadLink.href = url;
    downloadLink.download = `history_export_${stamp}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="history__container">
      <Box className="history__toolbar">
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={exportHistoryToExcel}
          disabled={isLoading || !rawHistoryData.length}
        >
          Export to Excel
        </Button>
      </Box>
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
