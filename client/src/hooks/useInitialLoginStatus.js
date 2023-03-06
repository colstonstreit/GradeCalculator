import { useState, useEffect } from "react";

import NetworkAPI from "../lib/networkAPI";

export default function useInitialLoginStatus() {
  const [loggedIn, setLoggedIn] = useState(null);

  function fetchInfo() {
    NetworkAPI.get("/api/user/loginStatus")
      .then(({ data }) => setLoggedIn(data.loggedIn))
      .catch(() => setLoggedIn(false));
  }

  useEffect(() => {
    fetchInfo();
  }, []);

  return loggedIn;
}
