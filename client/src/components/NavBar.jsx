import React from "react";
import { Link, useNavigate } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

export default function NavBar({ loggedIn }) {
  const navigate = useNavigate();

  function logout() {
    NetworkAPI.post("/api/auth/logout");
    navigate("/login");
    navigate(0);
  }

  return (
    <nav>
      <Link to="/">Welcome Page</Link>
      <Link to="/courses">My Courses</Link>
      {!loggedIn && <Link to="/login">Login</Link>}
      {loggedIn && <button onClick={logout}>Logout</button>}
    </nav>
  );
}
