import { styled } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  "--DataGrid-t-header-background-base": "#141c2d",
  backgroundColor: "#050b1a !important",
  color: "#dbe3ff !important",
  borderColor: "#2b3551 !important",
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#141c2d !important",
    borderBottom: "1px solid #2b3551 !important",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    color: "#dbe3ff !important",
    fontWeight: 500,
    fontSize: "17px",
  },
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
      disableColumnReorder
      disableColumnResize
      onMouseOverCapture={suppressNativeTitle}
    />
  );
};

export default BaseDataGrid;
