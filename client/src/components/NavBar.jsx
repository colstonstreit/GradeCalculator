import React from "react";
import { Link } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

function logout() {
  NetworkAPI.post("/api/auth/logout");
  window.location.href = "/login";
}

export default function NavBar({ loggedIn }) {
  return (
    <nav>
      <Link to="/">Welcome Page</Link>
      <Link to="/courses">My Courses</Link>
      {!loggedIn && <Link to="/login">Login</Link>}
      {loggedIn && <button onClick={logout}>Logout</button>}
    </nav>
  );
}
