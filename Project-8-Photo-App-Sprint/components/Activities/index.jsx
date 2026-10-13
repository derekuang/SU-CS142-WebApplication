import React from "react";

import useActivities from "../../client/controllers/useActivities.js";
import ActivitiesView from "../../client/views/ActivitiesView.jsx";

import "./styles.css";

/**
 * Define Activities, a React component of CS142 Project 8.
 *
 * Thin controller: the hook owns fetching and polling the feed, the view renders
 * it. The Refresh button is the hook's immediate refetch.
 */
function Activities() {
  const { activities, error, refresh } = useActivities();

  return (
    <ActivitiesView activities={activities} error={error} onRefresh={refresh} />
  );
}

export default Activities;
