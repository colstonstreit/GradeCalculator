import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StorageAPI from "../lib/storageAPI";
import { round } from "../lib/scoreUtil";

import styles from "../styles/CourseList.module.css";
import { calculateScore, extractUnknowns, extractKnowns } from "../lib/scoreUtil";

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
      <div className={styles.courseListContainer}>
        {courses.map((course) => {
          const title = course.title;
          const currentScore = calculateScore(course.root); // or null
          const numUnknowns = extractUnknowns(course.root).length;
          const numKnowns = extractKnowns(course.root).length;

          // Treat null as meeting goal
          const meetsGoal = (currentScore ?? 999) >= course.desiredScore;

          return (
            <div key={title} className={styles.courseCard} onClick={() => navigate(`/courses/${title}`)}>
              <p className={styles.courseTitle}>{title}</p>
              <div className={styles.courseInfo}>
                <p title={`Desired Score: ${course.desiredScore}`}>
                  Current Score:{" "}
                  <span className={meetsGoal ? styles.goodScore : styles.badScore}>
                    {`${round(currentScore)}%` || "N/A"}
                  </span>
                </p>
                <p>
                  {numKnowns} / {numKnowns + numUnknowns} Graded
                </p>
              </div>
            </div>
          );
        })}
        <button className={styles.courseCard} onClick={addNewCourse}>
          <p className={styles.courseTitle}>Add Course</p>
        </button>
      </div>
    </>
  );
}
