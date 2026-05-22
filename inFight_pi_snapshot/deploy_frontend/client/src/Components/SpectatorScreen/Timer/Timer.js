import React from "react";
import "./Timer.css";

export default function Timer(props) {
  return (
    <div className="timer">
      <span className="digits">
        {("00" + Math.floor((props.time / 1000))).slice(-3)}.
      </span>
      <span className="digits mili-sec">
        {("0" + ((props.time / 10) % 100)).slice(-2)}
      </span>
      <span className="digits addDigit">{("" + props.thirdDig).slice(-1)}</span>
    </div>
  );
}
