import { useState, useEffect } from "react";

export default function useAuth() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(async () => {
    const isLoggedIn = await (await fetch("/api/auth/isLoggedIn", { method: 'POST' })).json();
    setIsLoggedIn(isLoggedIn);
  }, []);

  return isLoggedIn;
}