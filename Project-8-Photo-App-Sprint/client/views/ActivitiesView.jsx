import React from "react";
import {
  Box,
  Button,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";

import humanize from "../utils/humanize.js";
import activityLabel from "../utils/activityLabels.js";

/**
 * Presentational view for the activity feed.
 *
 * Renders only what it is given: `activities` (the newest first, or undefined
 * while the first load is in flight), an `error` message when a fetch failed,
 * and `onRefresh` for the manual Refresh button. It performs no data fetching.
 */

/**
 * The actor's display name, with a fallback for an account that no longer
 * exists (possible once account deletion is supported).
 */
function actorName(user) {
  return user ? `${user.first_name} ${user.last_name}` : "Unknown user";
}

/**
 * One activity: a thumbnail for uploads/comments (linking to that photo in its
 * owner's photo view), the actor's name (linking to their profile), the action
 * phrase, and the human-friendly time.
 */
function ActivityItem({ activity }) {
  const { user, photo } = activity;

  return (
    <ListItem>
      {photo ? (
        <Link
          href={`#/photos/${photo.user_id}/${photo._id}`}
          underline="none"
          sx={{ mr: 2 }}
        >
          <Box
            component="img"
            alt={photo.file_name}
            src={`images/${photo.file_name}`}
            sx={{
              width: 64,
              height: 64,
              objectFit: "cover",
              borderRadius: 1,
              display: "block",
            }}
          />
        </Link>
      ) : null}
      <ListItemText
        primary={
          // eslint-disable-next-line react/jsx-wrap-multilines
          <Box>
            {user ? (
              <Link
                href={`#/users/${user._id}`}
                color="inherit"
                underline="hover"
                sx={{ fontWeight: "bold" }}
              >
                {actorName(user)}
              </Link>
            ) : (
              <Typography component="span" color="text.secondary">
                {actorName(user)}
              </Typography>
            )}
            {` ${activityLabel(activity.type)}`}
          </Box>
        }
        secondary={humanize(activity.date_time)}
      />
    </ListItem>
  );
}

function ActivitiesView({ activities, error, onRefresh }) {
  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Activities</Typography>
        <Button variant="outlined" onClick={onRefresh}>
          Refresh
        </Button>
      </Stack>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      {!activities && !error ? <Box>Loading...</Box> : null}

      {activities && activities.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No activities yet
        </Typography>
      ) : null}

      {activities && activities.length > 0 ? (
        <List>
          {activities.map((activity) => {
            return (
              <React.Fragment key={activity._id}>
                <ActivityItem activity={activity} />
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
      ) : null}
    </Stack>
  );
}

export default ActivitiesView;
