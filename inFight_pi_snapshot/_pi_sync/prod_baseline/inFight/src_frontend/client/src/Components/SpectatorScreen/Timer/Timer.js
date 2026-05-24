import React from "react";
import "./Timer.css";

export default function Timer(props) {
  const totalSeconds = Math.floor((props.time / 1000) % 10000);
  const milliseconds = Math.floor((props.time / 10) % 100);
  return (
    <div className="timer">
      <span className="digits">
        {String(totalSeconds).padStart(4, "0")}.
      </span>
      <span className="digits mili-sec">
        {("0" + milliseconds).slice(-2)}
      </span>
      <span className="digits addDigit">{("" + props.thirdDig).slice(-1)}</span>
    </div>
  );
}
