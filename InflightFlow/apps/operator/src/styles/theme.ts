import { createTheme } from "@mui/material/styles";

declare module "@mui/material/Chip" {
  interface ChipPropsVariantOverrides {
    info: true;
    default: true;
    alert: true;
    success: true;
    error: true;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#3c2bfe",
      light: "#675afc",
      dark: "#675AFC",
    },
    secondary: {
      main: "#3c2bfe",
      light: "#675afc",
      dark: "#3c2bfe",
    },
    // background: {
    //   default: "#ffffff",
    // },
    // error: {
    //   main: "#ff0000",
    // },
    // success: {
    //   main: "#3fce9d",
    //   light: "#f0fbf7",
    // },
    // warning: {
    //   main: "#ff9f43",
    //   light: "#fff3e8",
    // },
  },
  components: {
    MuiChip: {
      variants: [
        {
          props: { variant: "info" },
          style: {
            backgroundColor: "#562cff",
            color: "#FFFFFF",
          },
        },
        {
          props: { variant: "default" },
          style: {
            backgroundColor: "#EFF4FF",
            color: "#1455FD",
          },
        },
        {
          props: { variant: "alert" },
          style: {
            backgroundColor: "#FFF3E8",
            color: "#FF9F43",
          },
        },
        {
          props: { variant: "success" },
          style: {
            backgroundColor: "#F0FBF7",
            color: "#3FCE9D",
          },
        },
        {
          props: { variant: "error" },
          style: {
            backgroundColor: "#FFF1F1",
            color: "#FF0000 ",
          },
        },
      ],
    },
  },
});

export default theme;
