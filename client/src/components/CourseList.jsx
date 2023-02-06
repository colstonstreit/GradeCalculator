import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CourseList({ user }) {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    const getCourses = async () => {
      const newCourses = await (await fetch("/api/courses")).json();
      setCourses(newCourses);
    };
    getCourses();
  }, []);

  async function addNewCourse() {
    const title = prompt("What would you like to name your course?").trim();
    if (!title || title === "") return;
    const response = await fetch("/api/courses", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
      }),
    });
    if (response.ok && response.redirected) {
      window.location.href = response.url;
    } else {
      const body = await response.json();
      alert(body);
    }
  }

  return (
    <>
      {courses.map((courseName, idx) => (
        <p key={idx}>
          <Link to={`/courses/${courseName}`}>{courseName}</Link>
        </p>
      ))}
      <button onClick={addNewCourse}>Add Another Course</button>
    </>
  );
}
