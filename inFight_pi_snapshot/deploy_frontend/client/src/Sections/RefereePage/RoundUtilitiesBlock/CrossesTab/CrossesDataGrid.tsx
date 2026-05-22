import formatTime from "../../../../utils/formatTime";
import BaseDataGrid from "../../../../Components/UI/BaseDataGrid/BaseDataGrid";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import { GridActionsCellItem } from "@mui/x-data-grid";

const CrossesDataGrid = (props) => {
  const { crossesData = [], deleteCross = () => { } } = props;

  const deleteHandler = (e) => () => {
    console.log(e);
    deleteCross(e.id);
  };

  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 60,
      flex: 1,
    },

    {
      field: "cross",
      headerName: "time",
      maxWidth: 170,
      sortable: false,
      editable: false,
      flex: 4,
    },
    {
      field: "actions",
      type: "actions",
      sortable: false,
      editable: false,
      headerName: "",
      align: "right",
      flex: 6,
      maxWidth: 500,
      cellClassName: "actions",
      getActions: (e) => {
        return [
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          <GridActionsCellItem
            disabled={crossesData?.length <= 2}
            sx={{
              "&:hover": { backgroundColor: "#ff000030" },
              "&:disabled svg": { color: "gray" },
            }}
            onClick={deleteHandler(e)}
            icon={
              <DeleteIcon
                sx={{
                  color: "#ff0000",
                }}
              />
            }
            label="Delete"
            className="textPrimary"
          />,
        ];
      },
    },
  ];

  return (
    <BaseDataGrid
      sx={{
        height: "400px",
      }}
      columns={columns}
      rows={crossesData?.map((crossing, i) => ({
        ...crossing,
        id: i,
        counter: i + 1,
        cross:
          formatTime(crossing.cross).fullTime() === "-"
            ? "00:00:000"
            : formatTime(crossing.cross).fullTime(),
      }))}
    />
  );
};

export default CrossesDataGrid;
