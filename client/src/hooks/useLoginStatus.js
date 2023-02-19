import { useState, useEffect } from "react";

import NetworkAPI from "../lib/networkAPI";

const refreshDelaySeconds = 15;

export default function useLoginStatus() {
  const [loggedIn, setLoggedIn] = useState(true);

  function fetchInfo() {
    NetworkAPI.get("/api/user/loginStatus").then(({ data: user }) => {
      setLoggedIn(!!user.loggedIn);
    });
  }

  useEffect(() => {
    fetchInfo();
    const id = setInterval(fetchInfo, refreshDelaySeconds * 1000);
    return () => clearInterval(id);
  }, []);

  return loggedIn;
}
