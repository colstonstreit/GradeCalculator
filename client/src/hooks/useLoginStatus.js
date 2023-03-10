import { useState, useEffect } from "react";

import NetworkAPI from "../lib/networkAPI";

const refreshDelaySeconds = 15;

export default function useLoginStatus(initiallyLoggedIn) {
  const [loggedIn, setLoggedIn] = useState(initiallyLoggedIn);
  const [shownError, setShownError] = useState(false);

  useEffect(() => {
    if (initiallyLoggedIn) {
      function fetchInfo() {
        NetworkAPI.get("/api/user/loginStatus")
          .then(({ data }) => {
            setLoggedIn(data.loggedIn);
            if (shownError) {
              alert("Communications with the server appear to be back online!");
              setShownError(false);
            }
          })
          .catch(() => {
            if (!shownError) {
              setShownError(true);
              alert("Communications with the server have been interrupted.");
            }
          });
      }

      fetchInfo();
      const id = setInterval(fetchInfo, refreshDelaySeconds * 1000);
      return () => clearInterval(id);
    }
  }, [initiallyLoggedIn, shownError]);

  return loggedIn;
}
