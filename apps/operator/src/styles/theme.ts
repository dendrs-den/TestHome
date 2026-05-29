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
  typography: {
    fontFamily: "Manrope, Segoe UI, sans-serif",
    h1: { fontFamily: "Sora, Manrope, sans-serif" },
    h2: { fontFamily: "Sora, Manrope, sans-serif" },
    h3: { fontFamily: "Sora, Manrope, sans-serif" },
    h4: { fontFamily: "Sora, Manrope, sans-serif" },
    h5: { fontFamily: "Sora, Manrope, sans-serif" },
    h6: { fontFamily: "Sora, Manrope, sans-serif" },
  },
  palette: {
    mode: "dark",
    primary: {
      main: "#5a67ff",
      light: "#7b86ff",
      dark: "#4652f1",
    },
    secondary: {
      main: "#f0c75d",
      light: "#ffd97c",
      dark: "#d6af45",
    },
    background: {
      default: "#06080e",
      paper: "#101522",
    },
    text: {
      primary: "#e6ebff",
      secondary: "#aeb7d1",
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        autoComplete: "off",
      },
    },
    MuiInputBase: {
      defaultProps: {
        autoComplete: "off",
        inputProps: {
          autoComplete: "off",
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(1200px 600px at 20% -10%, #1d2333 0%, #080a0f 45%, #050608 100%)",
          color: "#e6ebff",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#101522",
          border: "1px solid #242d44",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        size: "medium",
      },
      styleOverrides: {
        root: {
          borderRadius: "10px",
          textTransform: "none",
          fontWeight: 700,
          fontSize: "14px",
          lineHeight: "17px",
          minHeight: "42px",
          minWidth: "120px",
          padding: "10px 24px",
          fontFamily: "Manrope, Segoe UI, sans-serif",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#0e1320",
        },
        notchedOutline: {
          borderColor: "#394462",
        },
      },
    },
    MuiChip: {
      variants: [
        {
          props: { variant: "info" },
          style: {
            backgroundColor: "#5a67ff",
            color: "#FFFFFF",
          },
        },
        {
          props: { variant: "default" },
          style: {
            backgroundColor: "#1a2236",
            color: "#9fb0ff",
          },
        },
        {
          props: { variant: "alert" },
          style: {
            backgroundColor: "#2b2212",
            color: "#f0c75d",
          },
        },
        {
          props: { variant: "success" },
          style: {
            backgroundColor: "#15261d",
            color: "#78d89a",
          },
        },
        {
          props: { variant: "error" },
          style: {
            backgroundColor: "#2b1719",
            color: "#ff8f8f",
          },
        },
      ],
    },
  },
});

export default theme;
