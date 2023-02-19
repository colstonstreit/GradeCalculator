import { useState, useEffect } from "react";

import NetworkAPI from "../lib/networkAPI";

export default function useUserInfo() {
  const [userInfo, setUserInfo] = useState({ loggedIn: null });

  useEffect(() => {
    function fetchInfo() {
      NetworkAPI.get("/api/user/loginStatus").then(({ data: user }) => {
        setUserInfo(user);
      });
    }
    fetchInfo();
  }, []);

  return userInfo;
}
