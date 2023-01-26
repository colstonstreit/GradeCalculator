import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function NavBar({loggedIn}) {
  return <nav>
    <Link to="/">Main Page</Link>
    <Link to="/home">Home</Link>
    {!loggedIn && <Link to="/login">Login</Link>}
    {loggedIn && <form method="POST" action="/api/auth/logout"><button type="submit">Logout</button></form>}
  </nav>
}