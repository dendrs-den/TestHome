import AddRowForm from "../AddTeamComponent/AddRowForm";
import { DataGrid, GridCloseIcon } from "@mui/x-data-grid";
import classes from "./TournamentTableParameter.module.css";
import "../../../styles/custom-scrolling.scss";

import { Button } from "@mui/material";

const TournamentTableParameter = (props) => {
  const { data: listItems, placeholder, tableHeader } = props;

  const columns = [
    {
      field: "counter",
      headerName: "#",
      maxWidth: 60,
      flex: 1,
    },
    {
      field: "name",
      headerName: "name",
      maxWidth: 180,
      editable: true,
      flex: 3,
    },
    {
      field: "number",
      headerName: "number",
      maxWidth: 180,
      flex: 3,
    },
    {
      field: "action",
      headerName: "",
      maxWidth: 830,
      headerClassName: "hideRightSeparator",
      flex: 18,
      align: "right",
      sortable: false,
      renderCell: ({ row }) => {
        const onClick = (e) => {
          e.stopPropagation();

          props.deleteRow(row);
        };
        const onClick2 = (e) => {
          e.stopPropagation();

          console.log(row);
          props.deleteRow(row);
        };

        if (!row.inDB) {
          return (
            <Button
              className={classes.deleteBtn}
              onClick={onClick}
              variant="text"
              color="error"
            >
              <GridCloseIcon></GridCloseIcon>
            </Button>
          );
        } else
          return (
            <Button
              className={classes.deleteBtn}
              onClick={onClick2}
              variant="text"
              color="error"
            >
              <GridCloseIcon></GridCloseIcon>
            </Button>
          );
      },
    },
  ];

  const rows = listItems.map((item, index) => {
    return {
      ...item,
      id: item?.id || index + 1,
      counter: index + 1,
      name: item.name,
    };
  });

  return (
    <div className={classes["table-parameter"]}>
      <div className={classes["table-parameter__upper-row"]}>
        <h4 className={classes["table-parameter__header"]}>
          {props.tableHeader}
        </h4>
        <AddRowForm
          onAddClick={props.addElementHandler}
          placeHolder={placeholder}
          type={tableHeader}
        />
      </div>
      <div className={classes["table-parameter__table-container"]}>
        <DataGrid
          className={classes["table"]}
          autoHeight={false}
          rows={rows}
          columns={
            tableHeader === "Teams"
              ? columns
              : columns.filter((col) => col.field !== "number")
          }
          onCellEditStop={(e) => {
            console.log(e);
            console.log(e.value);
          }}
          autoPageSize={false}
          hideFooter
          disableColumnSelector
          disableColumnFilter
          disableColumnMenu
          disableColumnSorting
          rowsPerPageOptions={[20]}
        />
      </div>
    </div>
  );
};
export default TournamentTableParameter;
