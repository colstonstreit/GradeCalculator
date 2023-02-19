import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NetworkAPI from "../lib/networkAPI";
import AuthenticatedPage from "./AuthenticatedPage";

function addNewCourse() {
  let title = prompt("What would you like to name your course?");
  if (!title) return;
  title = title.trim();

  NetworkAPI.post(`/api/courses`, { title })
    .then((_) => {
      // Redirect to new course's page
      window.location.href = `/courses/${title}`;
    })
    .catch(({ status, error }) => {
      alert("Error Occurred: " + status + " " + error);
    });
}

export default function CourseList({ user }) {
  const [courses, setCourses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function getCourses() {
      NetworkAPI.get(`/api/courses`)
        .then(({ data: newCourses }) => {
          setCourses(newCourses);
          setLoaded(true);
        })
        .catch(({ status, error }) => {
          alert("Error: " + status + " " + error);
        });
    }
    getCourses();
  }, []);

  if (!loaded) return "";

  return (
    <AuthenticatedPage>
      <div className="courseListContainer">
        {courses.map((courseName, idx) => (
          <Link key={courseName} to={`/courses/${courseName}`}>
            {courseName}
          </Link>
        ))}
        <button onClick={addNewCourse}>Add Course</button>
      </div>
    </AuthenticatedPage>
  );
}
