import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function NavBar({user}) {
  return <nav>
    <Link to="/">Main Page</Link>
    <Link to="/home">Home</Link>
    {user.loggedIn && <Link to="/courses">My Courses</Link>}
    {!user.loggedIn && <Link to="/login">Login</Link>}
    {user.loggedIn && <form method="POST" action="/api/auth/logout"><button type="submit">Logout</button></form>}
  </nav>
}