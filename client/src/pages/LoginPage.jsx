import React from "react";
import { Link, useNavigate } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

export default function LoginPage() {
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const { username, password } = e.target;
    NetworkAPI.post("/api/auth/login", {
      username: username.value,
      password: password.value,
    })
      .then(() => {
        navigate("/courses");
        navigate(0);
      })
      .catch(({ error }) => {
        alert("There seems to be an error connecting to the server. In the meantime, feel free to work offline!");
      });
  }

  return (
    <main>
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
    </main>
  );
}
