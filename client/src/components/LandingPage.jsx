import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function LandingPage({user}) {

  return <>
    <h1>Welcome to the Grade calculator, {user.loggedIn ? user.username : "Anonymous"}!</h1>
    <p>Login <Link to="/login">here!</Link></p>
    <p>Or Register <Link to="/register">here!</Link></p>
  </>
}