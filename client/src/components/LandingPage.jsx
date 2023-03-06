import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <>
      <h1>Welcome to the Grade calculator!</h1>
      <p>
        Login <Link to="/login">here!</Link>
      </p>
      <p>
        Or Register <Link to="/register">here!</Link>
      </p>
    </>
  );
}
