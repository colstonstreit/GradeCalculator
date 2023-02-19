import React from "react";
import { useState, useEffect } from "react";
import useLoginStatus from "../hooks/useLoginStatus";

import NetworkAPI from "../lib/networkAPI";

export default function AuthenticatedPage({ children }) {
  let loggedIn = useLoginStatus();
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const { username, password } = e.target;
    NetworkAPI.post("/api/auth/login", {
      username: username.value,
      password: password.value,
    })
      .then((_) => {
        setJustLoggedIn(true);
      })
      .catch(({ error }) => {
        alert("Error occurred while attempting to log in: " + error);
      });
  }

  useEffect(() => {
    if (loggedIn) setJustLoggedIn(false);
  }, [loggedIn]);

  return (
    <>
      {children}
      {!loggedIn && !justLoggedIn && (
        <div className="darkOverlay">
          <div className="loginPrompt">
            <h2 style={{ textAlign: "center", marginBottom: "0.5em" }}>Please login again.</h2>
            <form method="POST" action="/api/auth/login" onSubmit={handleSubmit}>
              <div className="formEntry">
                <label htmlFor="usernameInput">Username: </label>
                <input required name="username" type="text" id="usernameInput" />
              </div>

              <div className="formEntry">
                <label htmlFor="passwordInput">Password: </label>
                <input required name="password" type="password" id="passwordInput" />
              </div>

              <button type="submit">Login</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
