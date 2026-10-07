import { useEffect, useState } from "react";

import { getUser } from "../model/api/userApi.js";

/**
 * Controller for a single user's detail view.
 *
 * Fetches the user for `userId` and refetches whenever that id changes.
 * Returns `{ user }` where `user` is undefined until loaded.
 */
function useUserDetail(userId) {
  const [user, setUser] = useState();

  useEffect(() => {
    getUser(userId).then(setUser);
  }, [userId]);

  return { user };
}

export default useUserDetail;
