import React from "react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <>
      <h1>Register to Grade Calculator Here!</h1>
      <form method="POST" action="/api/auth/register">
        <div>
          <label for="usernameInput">Username: </label>
          <input name="username" type="text" id="usernameInput" />
        </div>

        <div>
          <label for="passwordInput">Password: </label>
          <input name="password" type="password" id="passwordInput" />
        </div>

        <div>
          <label for="confirmPasswordInput">Confirm Password: </label>
          <input
            name="confirmPassword"
            type="password"
            id="confirmPasswordInput"
          />
        </div>

        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account! Log in <Link to="/login">here!</Link>
      </p>
    </>
  );
}
