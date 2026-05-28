import { Button, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import classes from "./AddRowForm.module.css";

const AddRowForm = (props) => {
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [isFilled, setIsFilled] = useState(false);
  const [valueIsValid, setValueIsValid] = useState(true);
  const [numberIsValid, setNumberIsValid] = useState(true);
  const [numberIsFilled, setNumberIsFilled] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  const ChangeItemNameHandler = (event) => {
    setTextValue(event.target.value);
    event.target.value === "" ? setIsFilled(false) : setIsFilled(true);
  };
  const changeItemNumberHandler = (event) => {
    const newValue = event.target.value;
    if (!newValue.match(/^(\s*|\d+)$/) || (newValue.length > 0 && newValue.trim() === "")) {
      return;
    } else {
      setNumberValue(event.target.value);
      newValue === "" ? setNumberIsFilled(false) : setNumberIsFilled(true);
    }
  };

  const blurHandler = () => {
    if (textValue.length > 0 && textValue.trim() === "") {
      setValueIsValid(false);
    }
  };

  const numberBlurHandler = () => {
    if (numberValue.trim() === "") {
      setNumberIsValid(false);
    }
  };

  const AddRowHandler = (event) => {
    event.preventDefault();

    if (textValue.trim() !== "") {
      const newRow =
        props.type !== "Teams"
          ? {
              name: textValue.trim(),
            }
          : {
              name: textValue.trim(),
              number: Number(numberValue),
            };
      props.onAddClick(newRow);
      setTextValue("");
      setNumberValue("");
      setIsFilled(false);
    } else {
      setValueIsValid(false);
    }
  };

  useEffect(() => {
    setButtonEnabled(props.type === "Teams" ? isFilled && numberIsFilled : isFilled);
  }, [isFilled, numberIsFilled, props.type]);

  return (
    <div className={classes["container"]}>
      <div className={classes["input-container"]}>
        <TextField
          autoComplete="off"
          slotProps={{ htmlInput: { maxLength: 20 } }}
          className={classes["text-input"]}
          error={!valueIsValid}
          value={textValue}
          onChange={ChangeItemNameHandler}
          onFocus={() => setValueIsValid(true)}
          onBlur={blurHandler}
          variant="standard"
          placeholder={props.placeHolder[0]}
        />
        {props.type === "Teams" && (
          <TextField
            autoComplete="off"
            slotProps={{ htmlInput: { maxLength: 3 } }}
            className={classes["text-input"]}
            // error={!numberIsValid}
            value={numberValue}
            onChange={changeItemNumberHandler}
            onFocus={() => setNumberIsValid(true)}
            onBlur={numberBlurHandler}
            variant="standard"
            placeholder={props.placeHolder[1]}
          />
        )}
      </div>
      <Button
        disabled={!buttonEnabled}
        type="button"
        variant="contained"
        onClick={AddRowHandler}
        className={classes["button"]}
      >
        Add
      </Button>
    </div>
  );
};

export default AddRowForm;
