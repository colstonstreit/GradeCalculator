import "./global.css";

import React from "react";

// We use Route in order to define the different routes of our application
import { Route, Routes, Navigate } from "react-router-dom";

// We import all the components we need in our app
import NavBar from "./components/NavBar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CourseList from "./pages/CourseList";
import Course from "./pages/Course";
import useInitialLoginStatus from "./hooks/useInitialLoginStatus";

export default function App() {
  const loggedIn = useInitialLoginStatus();

  return (
    <>
      <NavBar loggedIn={loggedIn} />
      <main>
        {loggedIn !== null && (
          <Routes>
            <Route exact path="/" element={<LandingPage />} />
            <Route exact path="/login" element={<LoginPage />} />
            <Route exact path="/register" element={<RegisterPage />} />
            <Route exact path="/courses" element={<CourseList loggedIn={loggedIn} />} />
            <Route exact path="/courses/:title" element={<Course loggedIn={loggedIn} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </main>
    </>
  );
}
