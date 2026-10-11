import { useEffect, useState } from "react";

import { getUser } from "../model/api/userApi.js";
import { getUserUsage } from "../model/api/photoApi.js";

/**
 * Controller for a single user's detail view.
 *
 * Fetches the user for `userId` plus their usage summary (most recent and most
 * commented photo) and refetches whenever that id changes. Returns
 * `{ user, usage }`, each undefined until loaded. The selection logic lives on
 * the server; this controller only orchestrates the two requests.
 */
function useUserDetail(userId) {
  const [user, setUser] = useState();
  const [usage, setUsage] = useState();

  useEffect(() => {
    getUser(userId).then(setUser);
    getUserUsage(userId).then(setUsage);
  }, [userId]);

  return { user, usage };
}

export default useUserDetail;
