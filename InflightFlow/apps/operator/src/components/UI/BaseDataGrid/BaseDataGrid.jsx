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
  const suppressNativeTitle = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const titled = target.closest("[title]");
    if (titled instanceof HTMLElement) {
      titled.removeAttribute("title");
    }

    target.querySelectorAll?.("[title]").forEach((el) => {
      if (el instanceof HTMLElement) {
        el.removeAttribute("title");
      }
    });
  };

  return (
    <StyledDataGrid
      {...props}
      disableColumnFilter
      disableColumnMenu
      disableColumnSorting
      disableColumnResize
      onMouseOverCapture={suppressNativeTitle}
    />
  );
};

export default BaseDataGrid;
