import { useEffect, useState } from "react";

import { getUser } from "../model/api/userApi.js";
import { getUserUsage, getMentionsOfUser } from "../model/api/photoApi.js";

/**
 * Controller for a single user's detail view.
 *
 * Fetches the user for `userId`, their usage summary (most recent and most
 * commented photo), and the photos whose comments @mention them, refetching
 * whenever that id changes. Returns `{ user, usage, mentions }`, each undefined
 * until loaded. The selection logic lives on the server; this controller only
 * orchestrates the requests.
 */
function useUserDetail(userId) {
  const [user, setUser] = useState();
  const [usage, setUsage] = useState();
  const [mentions, setMentions] = useState();

  useEffect(() => {
    setUser(undefined);
    setUsage(undefined);
    setMentions(undefined);
    getUser(userId).then(setUser);
    getUserUsage(userId).then(setUsage);
    getMentionsOfUser(userId).then(setMentions);
  }, [userId]);

  return { user, usage, mentions };
}

export default useUserDetail;
