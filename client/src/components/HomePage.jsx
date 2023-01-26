import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function HomePage({loggedIn}) {

  return <>
    {loggedIn && <p>You are logged in!!</p>}
    <h1>Welcome to the Grade calculator!</h1>
    <p>Login <Link to="/login">here!</Link></p>
    <p>Or Register <Link to="/register">here!</Link></p>
  </>
}