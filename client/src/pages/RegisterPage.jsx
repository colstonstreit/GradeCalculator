import React from "react";
import { Link, useNavigate } from "react-router-dom";

import NetworkAPI from "../lib/networkAPI";

export default function RegisterPage() {
  const navigate = useNavigate();

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
      .then(() => {
        navigate("/courses");
        navigate(0);
      })
      .catch(({ status, error }) => {
        if (status >= 500) {
          alert("There seems to be an error connecting to the server. In the meantime, feel free to work offline!");
        } else {
          alert("Error while registering: " + error);
        }
      });
  }

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
