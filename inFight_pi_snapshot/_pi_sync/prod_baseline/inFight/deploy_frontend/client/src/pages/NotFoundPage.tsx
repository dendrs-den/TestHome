import { Box, Typography } from "@mui/material";
import { Fragment } from "react";
import { NavLink } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <Fragment>
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(to right,#2f80ed,#56ccf2)",
          a: {
            transition: "0.3s",
            padding: "0 10px",
            color: "#FFF",
            fontWeight: "bold",
            "&:hover": {
              color: "#562cff",
              transform: "scale(2)",
            },
          },
        }}
      >
        <Box display="flex" flexDirection="column" color="#FFF" textAlign="center">
          <Typography variant="h1" gutterBottom fontWeight="500">
            404
          </Typography>
          <Typography variant="h3">Looks like this page is missing.</Typography>
          <Typography variant="h3" marginTop="20px">
            Try <NavLink to={"/terminal"}>/terminal</NavLink>, <NavLink to={"/infoboard"}>/infoboard</NavLink> or
            <NavLink to={"/scoreboard"}>/scoreboard </NavLink> instead
          </Typography>
        </Box>
      </Box>
    </Fragment>
  );
};

export default NotFoundPage;
