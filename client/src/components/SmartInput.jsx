import React, { useState, useEffect } from "react";
import { numRegex } from "../pages/Course";

export function SmartInput({ regex, numeric, initValue = "", handleUpdate, className = "", ...rest }) {
  const [value, setValue] = useState(initValue);

  useEffect(() => setValue(initValue), [initValue]);

  function onUpdate(e) {
    if (regex.test(e.target.value)) {
      setValue(e.target.value);
      if (numeric) {
        if (
          handleUpdate(!isNaN(e.target.value) && e.target.value !== "" ? parseFloat(e.target.value) : null) === false
        ) {
          setValue((oldVal) => value);
        }
      } else {
        if (handleUpdate(e.target.value) === false) {
          setValue((oldVal) => value);
        }
      }
    }
  }

  return (
    <input
      className={`transparent ${className}`}
      type="text"
      value={value ?? ""}
      onChange={onUpdate}
      onBlur={(e) => {
        e.target.value = e.target.value.trim();
        onUpdate(e);
      }}
      maxLength={regex === numRegex ? 3 : Infinity}
      {...rest}
    />
  );
}
