import React from "react";
import { Link } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

function handleSubmit(e) {
  e.preventDefault();
  const { username, password } = e.target;
  NetworkAPI.post("/api/auth/login", {
    username: username.value,
    password: password.value,
  })
    .then((_) => {
      window.location.href = "/courses";
    })
    .catch(({ error }) => {
      alert("Error: " + error);
    });
}

export default function LoginPage() {
  return (
    <>
      <h1>Login to Grade Calculator Here!</h1>
      <form method="POST" action="/api/auth/login" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="usernameInput">Username: </label>
          <input required name="username" type="text" id="usernameInput" />
        </div>

        <div>
          <label htmlFor="passwordInput">Password: </label>
          <input required name="password" type="password" id="passwordInput" />
        </div>

        <button type="submit">Login</button>
      </form>

      <p>
        Don't have an account yet? Sign up <Link to="/register">here!</Link>
      </p>
    </>
  );
}
