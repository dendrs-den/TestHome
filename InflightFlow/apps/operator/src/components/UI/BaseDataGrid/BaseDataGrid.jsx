import { styled } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus": {
    outline: "none !important",
  },
  "& .MuiDataGrid-columnHeader:focus-within, & .MuiDataGrid-columnHeader:focus":
    {
      outline: "none !important",
    },
}));

const BaseDataGrid = (props) => {
  return (
    <StyledDataGrid
      {...props}
      disableColumnFilter
      disableColumnMenu
      disableColumnSorting
    />
  );
};

export default BaseDataGrid;
