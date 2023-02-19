import React from "react";
import { Link } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

function logout() {
  NetworkAPI.post("/api/auth/logout");
  window.location.href = "/login";
}

export default function NavBar({ user }) {
  return (
    <nav>
      <Link to="/">Welcome Page</Link>
      {user.loggedIn && <Link to="/courses">My Courses</Link>}
      {!user.loggedIn && <Link to="/login">Login</Link>}
      {user.loggedIn && <button onClick={logout}>Logout</button>}
    </nav>
  );
}
