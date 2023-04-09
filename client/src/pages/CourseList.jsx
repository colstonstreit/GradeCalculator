import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorageAPI from "../lib/storageAPI";

export default function CourseList({ loggedIn }) {
  const [courses, setCourses] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const navigate = useNavigate();

  function addNewCourse() {
    let title = prompt("What would you like to name your course?");
    if (!title) return;
    title = title.trim();

    StorageAPI.createCourse(title, loggedIn)
      .then(() => navigate(`/courses/${title}`))
      .catch((err) => alert(err.message));
  }

  useEffect(() => {
    function getCourses() {
      StorageAPI.getCourses(loggedIn)
        .then((courses) => {
          setCourses(courses);
          setLoaded(true);
        })
        .catch((err) => {
          alert(err.message);
        });
    }
    getCourses();
  }, [loggedIn]);

  if (!loaded) return "";

  return (
    <>
      <h1 style={{ textAlign: "center" }}>Your Courses {loggedIn ? "(Online)" : "(Offline)"}</h1>
      <div className="courseListContainer">
        {courses.map((courseName, idx) => (
          <Link key={courseName} to={`/courses/${courseName}`}>
            {courseName}
          </Link>
        ))}
        <button onClick={addNewCourse}>Add Course</button>
      </div>
    </>
  );
}
