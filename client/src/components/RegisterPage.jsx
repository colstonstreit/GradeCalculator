import React from "react";
import { Link } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

function handleSubmit(e) {
  e.preventDefault();
  const { username, password, confirmPassword } = e.target;
  if (password.value !== confirmPassword.value) {
    alert("Passwords do not match!");
    return;
  }
  NetworkAPI.post("/api/auth/register", {
    username: username.value,
    password: password.value,
  })
    .then((_) => {
      // Redirect to courses page
      window.location.href = "/courses";
    })
    .catch(({ error }) => {
      alert("Error: " + error);
    });
}

export default function RegisterPage() {
  return (
    <>
      <h1>Register to Grade Calculator Here!</h1>
      <form method="POST" action="/api/auth/register" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="usernameInput">Username: </label>
          <input required name="username" type="text" id="usernameInput" />
        </div>

        <div>
          <label htmlFor="passwordInput">Password: </label>
          <input required name="password" type="password" id="passwordInput" />
        </div>

        <div>
          <label htmlFor="confirmPasswordInput">Confirm Password: </label>
          <input required name="confirmPassword" type="password" id="confirmPasswordInput" />
        </div>

        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account! Log in <Link to="/login">here!</Link>
      </p>
    </>
  );
}
