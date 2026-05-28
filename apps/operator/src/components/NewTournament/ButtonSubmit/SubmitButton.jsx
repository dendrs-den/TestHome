import { Button } from "@mui/material";
import classes from "./SubmitButton.module.css";

const SubmitButton = (props) => {
  return (
    <Button
      disabled={!props.isEnabled}
      type="submit"
      form={props.formId}
      variant="contained"
      className={classes["submit-btn"]}
    >
      {props.editing ? "Save" : "Create"}
    </Button>
  );
};

export default SubmitButton;
