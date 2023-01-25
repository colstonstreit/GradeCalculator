import React, { useState, useEffect } from "react";

export default function GradeList() {

  const [grades, setGrades] = useState(["hi"]);
  useEffect(() => {
    async function getGrades() {
      const response = await fetch(`http://localhost:5000/record`);

      if (!response.ok) {
        const message = `An error occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const grades = await response.json();
      setGrades(grades);
    }

    getGrades();

  }, [grades.length]);

  return <>
    {grades.map(grade => <div key={grade}>{JSON.stringify(grade)}</div>)}
  </>
}