import React from "react";

// We use Route in order to define the different routes of our application
import { Route, Routes, Navigate } from "react-router-dom";

// We import all the components we need in our app
import NavBar from "./components/NavBar"
import HomePage from "./components/HomePage"
import LoginPage from "./components/LoginPage"
import RegisterPage from "./components/RegisterPage"
import useAuth from "./hooks/useAuth";

export default function App() {

  const loggedIn = useAuth();

  return (
    <>
      <NavBar loggedIn={loggedIn}/>
      <Routes>
        <Route exact path="/" element={<HomePage loggedIn={loggedIn}/>} />
        <Route exact path="/login" element={<LoginPage loggedIn={loggedIn} />} />
        <Route exact path="/register" element={<RegisterPage loggedIn={loggedIn} />} />
        {/* <Route path="/edit/:id" element={<Edit />} />
        <Route path="/create" element={<Create />} /> */}
        <Route path='*' element={<Navigate to="/"/>}/>
      </Routes>
    </>
  );
};