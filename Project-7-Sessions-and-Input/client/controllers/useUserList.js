import { useEffect, useState } from "react";

import { listUsers } from "../model/api/userApi.js";

/**
 * Controller for the user list view.
 *
 * Owns the data fetching and loading state, exposing the user list the view
 * renders. Returns `{ users }` where `users` is undefined until loaded.
 */
function useUserList() {
  const [users, setUsers] = useState();

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  return { users };
}

export default useUserList;
