// @ts-nocheck
import { Box, Button } from "@mui/material";
import { GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import "./FaultsDataGrid.scss";
import formatTime from "../../../../../utils/formatTime";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import BaseDataGrid from "../../../../../Components/UI/BaseDataGrid/BaseDataGrid";

const FaultsDataGrid = (props) => {
  const { faultsList, editFault, deleteFault } = props;

  const acceptFault = async ({ id }) => {
    editFault(id, true);
  };

  const columns: GridColDef[] | any = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 60,
      flex: 1,
    },
    {
      field: "type",
      headerName: "type",
      maxWidth: 100,
      editable: false,
      flex: 2,
    },
    {
      field: "time",
      headerName: "time",
      maxWidth: 160,
      editable: false,
      flex: 3,
    },
    {
      field: "device_type",
      cellClassName: "super-app-theme--device-type",
      headerName: "device type",
      maxWidth: 120,
      editable: false,
      flex: 3,
    },
    {
      field: "deleteCell",
      headerName: "",
      sortable: false,
      editable: false,
      align: "center",
      flex: 1.6,
      maxWidth: 350,
      renderCell: (params) => {
        return (
          <Box display="flex" width="100%" justifyContent="flex-end">
            {params.row.potentiallyInvalid && (
              <Button
                sx={{
                  textTransform: "capitalize",
                  textDecoration: "underline",
                }}
                onClick={() => acceptFault(params)}
                variant="text"
              >
                Accept
              </Button>
            )}
          </Box>
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      sortable: false,
      editable: false,
      headerName: "",
      align: "right",
      flex: 0.5,
      maxWidth: 100,
      getActions: ({ id }) => {
        return [
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <GridActionsCellItem
            icon={<DeleteIcon color="error" />}
            label="Delete"
            className="textPrimary"
            onClick={() => deleteFault(id)}
            color="inherit"
          />,
        ];
      },
    },
  ];

  const transformData = (initData) =>
    initData
      .sort((a, b) => (a.time < b.time ? -1 : 1))
      .map((fault, i) => ({
        id: fault.id || i,
        counter: i + 1,
        type: fault.type,
        time: fault.time ? formatTime(fault.time).fullTime() : "-",
        device_type: fault.device_type,
        deleteCell: "deleteCellData",
        potentiallyInvalid: !fault.valid,
      }));

  return (
    <BaseDataGrid
      sx={{
        height: "350px",
      }}
      columns={columns}
      rows={transformData(faultsList) || []}
      className={"faults_table"}
      getRowClassName={({ row }) =>
        `super-app-theme--${row.potentiallyInvalid} ${row.device_type}`
      }
      disableColumnFilter
      disableColumnSelector
      disableColumnMenu
    />
  );
};

export default FaultsDataGrid;
