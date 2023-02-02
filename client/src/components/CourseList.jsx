import React from "react";
import { Link } from "react-router-dom";

export default function CourseList({ user }) {
  return (
    <>
      {user.courses.map((course, idx) => (
        <p key={idx}>
          <Link to={`/courses/${course.title}`}>{course.title}</Link>
        </p>
      ))}
    </>
  );
}
