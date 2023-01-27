import { useState, useEffect } from "react";

export default function useUserInfo() {

  const [userInfo, setUserInfo] = useState({ loggedIn: null });

  useEffect(() => {
    const fetchInfo = async () => {
      const user = await (await fetch("/api/user/info")).json();
      setUserInfo(user);
    }
    fetchInfo();
  }, []);

  return userInfo;
}