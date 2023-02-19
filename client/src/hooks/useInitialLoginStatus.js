import { useState, useEffect } from "react";

import NetworkAPI from "../lib/networkAPI";

export default function useInitialLoginStatus() {
  const [userInfo, setUserInfo] = useState({ loggedIn: null });

  function fetchInfo() {
    NetworkAPI.get("/api/user/loginStatus")
      .then(({ data: user }) => {
        setUserInfo(user);
      })
      .catch(({ status, error }) => {
        alert("There seem to be connectivity problems with the server: " + status + " " + error);
      });
  }

  useEffect(() => {
    fetchInfo();
  }, []);

  return userInfo;
}
