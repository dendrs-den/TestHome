import { Box } from "@mui/material";
import CrossesDataGrid from "./CrossesDataGrid";

const CrossesTab = (props) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ fontWeight: "400", fontSize: "1.5rem", color: "#3c2bfe" }}>
          Crosses list
        </Box>
      </Box>

      <Box
        sx={{
          marginTop: "15px",
          height: "auto",
          border: "1px solid #d3d3d3",
        }}
      >
        <CrossesDataGrid
          crossesData={props.crossesList}
          deleteCross={props.deleteCross}
        />
      </Box>
    </Box>
  );
};

export default CrossesTab;
