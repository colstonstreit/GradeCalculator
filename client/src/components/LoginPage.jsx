import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <>
      <h1>Login to Grade Calculator Here!</h1>
      <form method="POST" action="/api/auth/login">
        <div>
          <label htmlFor="usernameInput">Username: </label>
          <input name="username" type="text" id="usernameInput" />
        </div>

        <div>
          <label htmlFor="passwordInput">Password: </label>
          <input name="password" type="password" id="passwordInput" />
        </div>

        <button type="submit">Login</button>
      </form>

      <p>
        Don't have an account yet? Sign up <Link to="/register">here!</Link>
      </p>
    </>
  );
}
